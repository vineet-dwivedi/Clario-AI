import { useCallback, useEffect, useRef, useState } from 'react'
import { transcribeVoice } from '../../service/chat.api'

function getSpeechSynthesisApi() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null
  }

  return window.speechSynthesis
}

function buildDraftFromVoice(initialText, transcript) {
  const parts = [String(initialText || '').trim(), String(transcript || '').trim()].filter(Boolean)
  return parts.join(' ').trim()
}

function cleanSpeechText(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' code block ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[#>*_~-]/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickVoice(voices) {
  if (!voices.length) {
    return null
  }

  const englishVoice = voices.find((voice) => String(voice.lang || '').toLowerCase().startsWith('en'))
  return englishVoice || voices[0]
}

function getMediaRecorderSupport() {
  return typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined'
}

function getRecordingMimeType() {
  if (typeof window === 'undefined' || !window.MediaRecorder?.isTypeSupported) {
    return ''
  }

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]

  return candidates.find((type) => window.MediaRecorder.isTypeSupported(type)) || ''
}

function getRecorderErrorMessage(errorName) {
  if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
    return 'Microphone permission is blocked. Allow mic access in the browser and try again.'
  }

  if (errorName === 'NotFoundError') {
    return 'Microphone was not found. Connect a mic and try again.'
  }

  if (errorName === 'NotReadableError') {
    return 'Microphone is busy in another app. Close that app and try again.'
  }

  if (errorName === 'AbortError') {
    return 'Voice recording stopped unexpectedly. Please try again.'
  }

  return 'Voice recording is not available on this browser or device.'
}

export function useVoiceAssistant() {
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const listeningSessionRef = useRef({ initialText: '', onTextChange: null })
  const spokenReplyKeyRef = useRef('')
  const availableVoicesRef = useRef([])
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [isVoiceReplyEnabled, setIsVoiceReplyEnabled] = useState(true)
  const isVoiceInputSupported =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    getMediaRecorderSupport()
  const isVoicePlaybackSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

  const stopRecordingStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const stopSpeaking = useCallback(() => {
    const speechSynthesisApi = getSpeechSynthesisApi()

    if (speechSynthesisApi) {
      speechSynthesisApi.cancel()
    }

    setIsSpeaking(false)
  }, [])

  const stopListening = useCallback(() => {
    const recorder = recorderRef.current

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }

    setIsListening(false)
  }, [])

  const startListening = useCallback(async ({ initialText = '', onTextChange } = {}) => {
    if (!isVoiceInputSupported) {
      setVoiceError('Voice input needs microphone recording support. Try a modern browser with mic access enabled.')
      return false
    }

    if (typeof window !== 'undefined' && !window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      setVoiceError('Voice input needs HTTPS when the app is not running on localhost.')
      return false
    }

    setVoiceError('')
    setIsTranscribing(false)
    chunksRef.current = []
    listeningSessionRef.current = {
      initialText,
      onTextChange,
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getRecordingMimeType()
      const recorder = mimeType ? new window.MediaRecorder(stream, { mimeType }) : new window.MediaRecorder(stream)

      streamRef.current = stream
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onerror = () => {
        setVoiceError('Voice recording stopped unexpectedly. Please try again.')
        setIsListening(false)
        setIsTranscribing(false)
        stopRecordingStream()
      }

      recorder.onstop = async () => {
        setIsListening(false)

        if (!chunksRef.current.length) {
          stopRecordingStream()
          return
        }

        setIsTranscribing(true)

        try {
          const audioBlob = new Blob(chunksRef.current, {
            type: recorder.mimeType || mimeType || 'application/octet-stream',
          })
          const response = await transcribeVoice(audioBlob)
          const transcript = String(response?.data?.text || '').trim()

          if (!transcript) {
            throw new Error('Voice transcription was empty. Please try again.')
          }

          listeningSessionRef.current.onTextChange?.(
            buildDraftFromVoice(listeningSessionRef.current.initialText, transcript),
          )
          setVoiceError('')
        } catch (error) {
          setVoiceError(error.message || 'Voice input could not be turned into text.')
        } finally {
          chunksRef.current = []
          setIsTranscribing(false)
          stopRecordingStream()
        }
      }

      recorder.start()
      setIsListening(true)
      return true
    } catch (error) {
      stopRecordingStream()
      setIsListening(false)
      setIsTranscribing(false)
      setVoiceError(getRecorderErrorMessage(error?.name))
      return false
    }
  }, [isVoiceInputSupported, stopRecordingStream])

  const toggleVoiceReplies = useCallback(() => {
    setIsVoiceReplyEnabled((currentValue) => {
      const nextValue = !currentValue

      if (!nextValue) {
        stopSpeaking()
      }

      return nextValue
    })
  }, [stopSpeaking])

  const resetSpokenReply = useCallback(() => {
    spokenReplyKeyRef.current = ''
  }, [])

  const speakReply = useCallback(
    ({ key, text }) => {
      if (!isVoiceReplyEnabled || !isVoicePlaybackSupported) {
        return false
      }

      const nextText = cleanSpeechText(text)

      if (!key || !nextText || spokenReplyKeyRef.current === key) {
        return false
      }

      const speechSynthesisApi = getSpeechSynthesisApi()

      if (!speechSynthesisApi) {
        return false
      }

      const utterance = new window.SpeechSynthesisUtterance(nextText)
      utterance.voice = pickVoice(availableVoicesRef.current)
      utterance.rate = 1
      utterance.pitch = 1

      utterance.onstart = () => {
        setVoiceError('')
        setIsSpeaking(true)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
      }

      utterance.onerror = () => {
        setIsSpeaking(false)
        setVoiceError('Voice reply could not be played on this device.')
      }

      spokenReplyKeyRef.current = key
      speechSynthesisApi.cancel()
      speechSynthesisApi.speak(utterance)
      return true
    },
    [isVoicePlaybackSupported, isVoiceReplyEnabled],
  )

  useEffect(() => {
    const speechSynthesisApi = getSpeechSynthesisApi()

    if (!speechSynthesisApi) {
      return undefined
    }

    const updateVoices = () => {
      availableVoicesRef.current = speechSynthesisApi.getVoices()
    }

    updateVoices()
    speechSynthesisApi.addEventListener?.('voiceschanged', updateVoices)

    return () => {
      speechSynthesisApi.removeEventListener?.('voiceschanged', updateVoices)
    }
  }, [])

  useEffect(() => {
    return () => {
      stopListening()
      stopSpeaking()
      stopRecordingStream()
    }
  }, [stopListening, stopSpeaking, stopRecordingStream])

  return {
    isListening,
    isSpeaking,
    isTranscribing,
    isVoiceInputSupported,
    isVoicePlaybackSupported,
    isVoiceReplyEnabled,
    resetSpokenReply,
    speakReply,
    startListening,
    stopListening,
    stopSpeaking,
    toggleVoiceReplies,
    voiceError,
  }
}
