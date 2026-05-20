import { Mic, MicOff } from 'lucide-react'
import { useVoiceToText } from '@/hooks/useVoiceToText'
import { useEffect } from 'react'

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
}

export default function VoiceInputButton({ onTranscript }: VoiceInputButtonProps) {
  const { isSupported, isListening, transcript, startListening, stopListening, resetTranscript } = useVoiceToText()

  useEffect(() => {
    if (transcript) {
      onTranscript(transcript)
      resetTranscript()
    }
  }, [transcript, onTranscript, resetTranscript])

  if (!isSupported) {
    return null // Hide button if browser doesn't support speech recognition
  }

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      style={{
        padding: '8px 12px',
        background: isListening ? '#e24b4a' : '#1a6b4a',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        fontSize: 13,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'inherit',
        transition: 'all 0.2s'
      }}
    >
      {isListening ? <MicOff size={14} /> : <Mic size={14} />}
      {isListening ? 'Stop Recording' : 'Voice Note'}
    </button>
  )
}
