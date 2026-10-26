import { useState, useCallback, useEffect, FormEvent } from 'react'
import { MicIcon, MicOffIcon, SendIcon, Loader2Icon, AlertCircleIcon, CheckCircleIcon, SettingsIcon, ChevronDownIcon, XIcon, KeyIcon } from 'lucide-react'
import { voiceService } from '@/services/voice'
import type { VoiceCommandResponse, VoiceProviderStatus, VoiceProvider, ProviderConfigRequest } from '@/types'
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
  const [showConfig, setShowConfig] = useState(false)
  const [configProvider, setConfigProvider] = useState<string>('openai')
  const [configApiKey, setConfigApiKey] = useState('')
  const [configBaseUrl, setConfigBaseUrl] = useState('')
  const [configModel, setConfigModel] = useState('')
  const [configError, setConfigError] = useState<string | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const responseId = useState(0)[0]

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

  const handleConfigureProvider = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!configApiKey.trim() || configLoading) return

    setConfigLoading(true)
    setConfigError(null)

    try {
      const request: ProviderConfigRequest = {
        name: configProvider,
        provider_type: configProvider as 'openai' | 'gemini' | 'mock',
        api_key: configApiKey.trim(),
        base_url: configBaseUrl.trim() || undefined,
        model: configModel.trim() || undefined,
        set_as_default: true,
      }

      const response = await voiceService.configureProvider(request)

      if (response.success) {
        setShowConfig(false)
        setConfigApiKey('')
        setConfigBaseUrl('')
        setConfigModel('')
        setConfigError(null)
        // Reload providers to reflect the new configuration
        await loadProviders()
      } else {
        setConfigError(response.message)
      }
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Failed to configure provider')
    } finally {
      setConfigLoading(false)
    }
  }, [configProvider, configApiKey, configBaseUrl, configModel, configLoading, loadProviders])

  const openConfig = (provider: string) => {
    setConfigProvider(provider)
    setShowConfig(true)
    setConfigError(null)
  }

  const getProviderDisplayName = (provider: string) => {
    const names: Record<string, string> = {
      mock: 'Mock (Demo)',
      openai: 'OpenAI Compatible',
      gemini: 'Google Gemini',
    }
    return names[provider] || provider
  }

  const getDefaultModel = (provider: string) => {
    const models: Record<string, string> = {
      openai: 'gpt-4o-mini',
      gemini: 'gemini-1.5-flash',
    }
    return models[provider] || ''
  }

  const getDefaultBaseUrl = (provider: string) => {
    const urls: Record<string, string> = {
      openai: 'https://api.openai.com/v1',
    }
    return urls[provider] || ''
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
                    } else if (provider.provider !== 'mock') {
                      // Open config for unavailable providers
                      openConfig(provider.provider)
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
                  {!provider.available && provider.provider !== 'mock' && (
                    <button
                      className={styles.configureBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        openConfig(provider.provider)
                      }}
                      aria-label={`Configure ${getProviderDisplayName(provider.provider)}`}
                    >
                      <KeyIcon size={12} />
                    </button>
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

      {/* Provider Configuration Modal */}
      {showConfig && (
        <div className={styles.modalOverlay} onClick={() => setShowConfig(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h4>Configure {getProviderDisplayName(configProvider)}</h4>
              <button className={styles.modalClose} onClick={() => setShowConfig(false)} aria-label="Close">
                <XIcon size={20} />
              </button>
            </div>
            <form onSubmit={handleConfigureProvider} className={styles.modalForm}>
              <div className={styles.modalField}>
                <label htmlFor="apiKey">API Key *</label>
                <input
                  id="apiKey"
                  type="password"
                  value={configApiKey}
                  onChange={e => setConfigApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  required
                  disabled={configLoading}
                />
              </div>
              <div className={styles.modalField}>
                <label htmlFor="baseUrl">Base URL</label>
                <input
                  id="baseUrl"
                  type="url"
                  value={configBaseUrl}
                  onChange={e => setConfigBaseUrl(e.target.value)}
                  placeholder={getDefaultBaseUrl(configProvider)}
                  disabled={configLoading}
                />
                {configProvider === 'openai' && (
                  <span className={styles.fieldHint}>Leave empty for default: {getDefaultBaseUrl(configProvider)}</span>
                )}
              </div>
              <div className={styles.modalField}>
                <label htmlFor="model">Model</label>
                <input
                  id="model"
                  type="text"
                  value={configModel}
                  onChange={e => setConfigModel(e.target.value)}
                  placeholder={getDefaultModel(configProvider)}
                  disabled={configLoading}
                />
                <span className={styles.fieldHint}>Leave empty for default: {getDefaultModel(configProvider)}</span>
              </div>
              {configError && (
                <div className={styles.modalError}>
                  <AlertCircleIcon size={16} />
                  <span>{configError}</span>
                </div>
              )}
              <div className={styles.modalActions}>
                <button type="button" className={styles.modalCancel} onClick={() => setShowConfig(false)} disabled={configLoading}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalSubmit} disabled={!configApiKey.trim() || configLoading}>
                  {configLoading ? <Loader2Icon size={16} /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

