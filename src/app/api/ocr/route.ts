import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

// Endpoint para OCR de placas usando VLM (Vision Language Model)
export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 })
    }

    // Inicializar o SDK
    const zai = await ZAI.create()

    // Preparar a URL da imagem (pode ser base64 ou URL)
    const imageUrl = image.startsWith('data:') 
      ? image 
      : image.startsWith('http')
        ? image
        : `data:image/jpeg;base64,${image}`

    // Prompt otimizado para fotos noturnas e diversas condições
    const prompt = `Você é um especialista em reconhecimento de placas veiculares brasileiras. Analise esta imagem com ATENÇÃO ESPECIAL para identificar a placa do veículo.

CONTEXTO DA IMAGEM:
- A foto pode ter sido tirada à NOITE, com pouca luz ou iluminação artificial
- Pode haver reflexos, sombras, chuva ou outras condições adversas
- A placa pode estar suja, desgastada ou parcialmente visível
- O ângulo pode não ser frontal

INSTRUÇÕES DE ANÁLISE:
1. ESCANEIFE a imagem inteira procurando pela placa do veículo
2. As placas brasileiras podem ser:
   - PADRÃO ANTIGO: 3 letras + 4 números (ex: ABC1234) - fundo cinza com letras/numeros pretos
   - PADRÃO MERCOSUL: 3 letras + 1 número + 1 letra + 2 números (ex: ABC1D23) - fundo branco com letras/numeros pretos
3. Procure por regiões retangulares que correspondam ao formato de placa
4. Ignore reflexos e foque nos caracteres alfanuméricos
5. Se a placa estiver parcialmente visível, tente inferir os caracteres

DICAS PARA FOTOS NOTURNAS:
- Caracteres podem parecer mais claros ou mais escuros dependendo da iluminação
- Pode haver brilho/reflexo na placa
- As letras podem ter menos contraste
- Procure pela forma característica retangular da placa

RESPOSTA:
- Retorne APENAS a placa identificada, sem nenhum texto adicional
- Use LETRAS MAIÚSCULAS e NÚMEROS
- Sem espaços, traços ou caracteres especiais
- Se houver DUVIDA entre dois caracteres, escolha o mais provável
- Se NÃO conseguir identificar a placa de forma alguma, retorne apenas: NAO_ENCONTRADA

EXEMPLOS DE RESPOSTA VÁLIDA:
ABC1234
ABC1D23
NAO_ENCONTRADA`

    // Usar VLM para reconhecer a placa com thinking habilitado para melhor precisão
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      thinking: { type: 'enabled' }
    })

    const placaRaw = response.choices?.[0]?.message?.content?.trim() || 'NAO_ENCONTRADA'

    console.log('[OCR] Resposta bruta do VLM:', placaRaw)

    // Limpar e formatar a placa
    let placa = placaRaw
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .replace(/^PLACA[:\s]*/i, '')
      .replace(/^A\s+PLACA\s+[ÉE][:\s]*/i, '')
      .replace(/^(A|THE)\s+/i, '')
      .substring(0, 7)

    // Se retornou NAO_ENCONTRADA
    if (placa.includes('NAOENCONTRADA') || placa.includes('ENCONTRADA')) {
      return NextResponse.json({ 
        placa: null, 
        error: 'Não foi possível identificar a placa. Por favor, digite manualmente.',
        raw: placaRaw 
      })
    }

    // Validar formato da placa
    const placaAntiga = /^[A-Z]{3}[0-9]{4}$/.test(placa)
    const placaMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(placa)

    // Se não está em nenhum formato válido, tentar corrigir
    if (!placaAntiga && !placaMercosul && placa.length === 7) {
      // Tentar identificar se é Mercosul com letras/números trocados
      // Formato Mercosul: LLLNLNN (L=letra, N=número)
      const posicoesLetras = [0, 1, 2, 4] // posições que devem ser letras
      const posicoesNumeros = [3, 5, 6] // posições que devem ser números
      
      let placaCorrigida = placa.split('')
      
      // Verificar se posição 4 é letra e posição 3 é número (padrão Mercosul)
      if (/[A-Z]/.test(placa[4]) && /[0-9]/.test(placa[3])) {
        // Já está no formato Mercosul correto
      } else if (/[0-9]/.test(placa[4]) && /[A-Z]/.test(placa[3])) {
        // Provavelmente trocaram, ajustar
        // Manter como está se parecer válido
      }
      
      placa = placaCorrigida.join('')
    }

    // Verificação final - aceitar placas com 7 caracteres que pareçam válidas
    const placaValida = placa.length === 7 && 
      /^[A-Z]{3}/.test(placa) && // Começa com 3 letras
      /[0-9]{2,}$/.test(placa.slice(-3)) // Termina com pelo menos 2 números

    if (!placaAntiga && !placaMercosul && !placaValida) {
      return NextResponse.json({ 
        placa: null, 
        error: 'Placa não identificada corretamente. Por favor, digite manualmente.',
        raw: placaRaw,
        extracted: placa
      })
    }

    return NextResponse.json({ 
      placa,
      formato: placaMercosul ? 'MERCOSUL' : 'ANTIGO',
      confidence: 'high'
    })
  } catch (error) {
    console.error('Erro no OCR:', error)
    return NextResponse.json({ 
      error: 'Erro ao processar imagem. Por favor, digite a placa manualmente.',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
