import { useState, useCallback, useEffect, FormEvent } from 'react'
import { MicIcon, MicOffIcon, SendIcon, Loader2Icon, AlertCircleIcon, CheckCircleIcon, SettingsIcon, ChevronDownIcon } from 'lucide-react'
import { voiceService } from '@/services/voice'
import type { VoiceCommandResponse, VoiceProviderStatus, VoiceProvider } from '@/types'
import styles from './VoicePanel.module.css'

interface VoicePanelProps {
  onAction?: (action: string, params: Record<string, unknown>) => void
}

export function VoicePanel({ onAction }: VoicePanelProps) {
  const [isListening, setIsListening] = useState(false)
  const [inputText, setInputText] = useState('')
  const [responses, setResponses] = useState<Array<{ id: number; text: string; isUser: boolean; success?: boolean }>>([])
  const [providers, setProviders] = useState<VoiceProviderStatus[]>([])
  const [selectedProvider, setSelectedProvider] = useState<VoiceProvider>('mock')
  const [showProviderSelect, setShowProviderSelect] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const responseId = useState(0)[0] // Use a ref-like pattern with useState for unique IDs

  // Load providers on mount
  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = useCallback(async () => {
    try {
      const data = await voiceService.getProviders()
      setProviders(data)
      // Set default to mock if available, otherwise first available
      const mockProvider = data.find(p => p.provider === 'mock' && p.available)
      const firstAvailable = data.find(p => p.available)
      if (mockProvider) {
        setSelectedProvider('mock')
      } else if (firstAvailable) {
        setSelectedProvider(firstAvailable.provider as VoiceProvider)
      }
    } catch (err) {
      setError('Failed to load voice providers')
      console.error(err)
    }
  }, [])

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isLoading) return

    const text = inputText.trim()
    setInputText('')
    setIsLoading(true)
    setError(null)

    // Add user message
    const userMsgId = Date.now()
    setResponses(prev => [...prev, { id: userMsgId, text, isUser: true }])

    try {
      const response = await voiceService.sendCommand({
        text,
        provider: selectedProvider,
      })

      const assistantMsgId = Date.now() + 1
      setResponses(prev => [...prev, { 
        id: assistantMsgId, 
        text: response.text, 
        isUser: false, 
        success: response.success 
      }])

      // Execute action if present
      if (response.action && response.action_params && onAction) {
        onAction(response.action, response.action_params)
      }
    } catch (err) {
      const assistantMsgId = Date.now() + 1
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setResponses(prev => [...prev, { 
        id: assistantMsgId, 
        text: `Error: ${errorMsg}`, 
        isUser: false, 
        success: false 
      }])
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [inputText, isLoading, selectedProvider, onAction])

  const handleVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser')
      return
    }

    // Use a simple prompt as fallback for voice input
    const transcript = prompt('Speak your command (or type it):')
    if (transcript) {
      setInputText(transcript)
      // Create a synthetic form submit event
      const form = document.createElement('form')
      const event = new Event('submit', { bubbles: true, cancelable: true })
      form.dispatchEvent(event)
      handleSubmit(event as unknown as React.FormEvent)
    }
  }, [handleSubmit])

  const getProviderDisplayName = (provider: string) => {
    const names: Record<string, string> = {
      mock: 'Mock (Demo)',
      openai: 'OpenAI Compatible',
      gemini: 'Google Gemini',
    }
    return names[provider] || provider
  }

  return (
    <div className={styles.voicePanel}>
      <div className={styles.header}>
        <h3>Voice Assistant</h3>
        <div className={styles.providerSelector}>
          <button
            className={styles.providerButton}
            onClick={() => setShowProviderSelect(!showProviderSelect)}
            aria-expanded={showProviderSelect}
            aria-haspopup="listbox"
          >
            <SettingsIcon size={16} />
            <span>{getProviderDisplayName(selectedProvider)}</span>
            <ChevronDownIcon size={16} />
          </button>
          {showProviderSelect && (
            <ul className={styles.providerDropdown} role="listbox">
              {providers.map(provider => (
                <li
                  key={provider.provider}
                  className={`${styles.providerOption} ${selectedProvider === provider.provider ? styles.selected : ''} ${!provider.available ? styles.unavailable : ''}`}
                  role="option"
                  aria-selected={selectedProvider === provider.provider}
                  onClick={() => {
                    if (provider.available) {
                      setSelectedProvider(provider.provider as VoiceProvider)
                      setShowProviderSelect(false)
                    }
                  }}
                >
                  <span>{getProviderDisplayName(provider.provider)}</span>
                  {provider.available ? (
                    <CheckCircleIcon size={14} className={styles.availableIcon} />
                  ) : (
                    <>
                      <AlertCircleIcon size={14} className={styles.unavailableIcon} />
                      {provider.error && <span className={styles.errorText}>{provider.error}</span>}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={styles.messages}>
        {responses.map(msg => (
          <div key={msg.id} className={`${styles.message} ${msg.isUser ? styles.userMessage : styles.assistantMessage} ${msg.success === false ? styles.errorMessage : ''}`}>
            <div className={styles.messageContent}>
              {msg.text}
            </div>
          </div>
        ))}
        {responses.length === 0 && (
          <div className={styles.emptyState}>
            Click the microphone or type a command like "fly to London" or "show cameras"
          </div>
        )}
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircleIcon size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className={styles.errorDismiss} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <div className={styles.inputWrapper}>
          <button
            type="button"
            className={styles.voiceButton}
            onClick={handleVoiceInput}
            disabled={isLoading || isListening}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <MicOffIcon size={20} /> : <MicIcon size={20} />}
          </button>
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type a command (e.g., 'fly to Tokyo')..."
            disabled={isLoading}
            className={styles.textInput}
            aria-label="Voice command input"
          />
          <button
            type="submit"
            className={styles.sendButton}
            disabled={!inputText.trim() || isLoading}
            aria-label="Send command"
          >
            {isLoading ? <Loader2Icon size={20} /> : <SendIcon size={20} />}
          </button>
        </div>
      </form>
    </div>
  )
}