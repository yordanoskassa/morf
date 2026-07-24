// Talk to the chatbot. ElevenLabs agent over a backend-minted signed URL. Morphable.
import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { morphClient } from './morphClient'

function VoiceButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const conv = useConversation({
    onMessage: ({ message, source }) => {
      // final user speech becomes a morph prompt
      if (source === 'user' && message.trim()) onTranscript(message.trim())
    },
    onError: (m) => toast.error('Voice error', { description: m }),
  })

  const connected = conv.status === 'connected'

  async function toggle() {
    if (connected) {
      conv.endSession()
      return
    }
    try {
      const { signed_url, error } = await morphClient.voiceSignedUrl()
      if (error || !signed_url) {
        toast.error('Voice unavailable', { description: error ?? 'no signed url' })
        return
      }
      await navigator.mediaDevices.getUserMedia({ audio: true })
      conv.startSession({ signedUrl: signed_url, connectionType: 'websocket' })
    } catch (e) {
      toast.error('Mic/connect failed', { description: String(e) })
    }
  }

  return (
    <Button size="sm" variant={connected ? 'default' : 'outline'} onClick={toggle}>
      {connected ? (conv.isSpeaking ? '● speaking' : '● listening') : 'Talk'}
    </Button>
  )
}

export function Voice({ onTranscript }: { onTranscript: (text: string) => void }) {
  return (
    <ConversationProvider>
      <VoiceButton onTranscript={onTranscript} />
    </ConversationProvider>
  )
}
