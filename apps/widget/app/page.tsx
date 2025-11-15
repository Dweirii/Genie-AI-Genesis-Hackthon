"use client"

import { useVapi } from "@/modules/widget/hooks/use-vapi"
import { Button } from "@workspace/ui/components/button";

export default function Page() {
  const {
     isConectting,
      isConnected,
      isSpkeaking,
      transcript,
      startCall,
      endCall,
  } = useVapi();

  return (
    <div className="flex items-center  flex-col justify-center min-h-svh">
       <Button onClick={ () => startCall() } >
          Start Call
       </Button>
       <Button onClick={ () => endCall() } >
          End Call
       </Button>
       <p>Is Connected: {`${isConnected}`}</p>
        <p>Is Connecting: {`${isConectting}`}</p>
        <p>Is Speaking: {`${isSpkeaking}`}</p>
        <p>{JSON.stringify(transcript, null, 2)}</p>
    </div>
  )
}
