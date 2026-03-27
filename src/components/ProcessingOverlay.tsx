'use client'

import { Check, AlertCircle } from 'lucide-react'

export type ProcessingStepStatus = 'pending' | 'processing' | 'done' | 'error'

export interface ProcessingStep {
  label: string
  status: ProcessingStepStatus
}

interface ProcessingOverlayProps {
  steps: ProcessingStep[]
}

export function ProcessingOverlay({ steps }: ProcessingOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-[90%] max-w-sm shadow-2xl">
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto mb-3 relative">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
          </div>
          <h3 className="text-lg font-semibold">Processando</h3>
          <p className="text-sm text-muted-foreground">Aguarde um momento...</p>
        </div>
        
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {step.status === 'done' && (
                  <Check className="w-5 h-5 text-emerald-500" />
                )}
                {step.status === 'processing' && (
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                )}
                {step.status === 'pending' && (
                  <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-600 rounded-full"></div>
                )}
                {step.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <span className={`text-sm ${
                step.status === 'done' ? 'text-emerald-600 dark:text-emerald-400 font-medium' :
                step.status === 'processing' ? 'text-slate-900 dark:text-white font-medium' :
                step.status === 'error' ? 'text-red-500' :
                'text-slate-500 dark:text-slate-400'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
