// src/features/cameras/lib/whep.ts
export async function connectWhep(
  video: HTMLVideoElement, 
  whepUrl: string, 
  signal: AbortSignal
): Promise<{ pc: RTCPeerConnection; close: () => void }> {
  const pc = new RTCPeerConnection();
  
  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });

  pc.ontrack = (event) => {
    video.srcObject = event.streams[0] ?? new MediaStream([event.track]);
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Ожидание завершения сбора ICE кандидатов (с таймаутом 2 сек)
  if (pc.iceGatheringState !== 'complete') {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }, 2000);

      const check = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }
      };
      
      pc.addEventListener('icegatheringstatechange', check);
    });
  }

  const res = await fetch(whepUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp' },
    body: pc.localDescription?.sdp,
    signal
  });

  if (!res.ok) {
    throw new Error(`Ошибка WHEP: код ${res.status}`);
  }

  const answerSdp = await res.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

  const location = res.headers.get('Location');
  const sessionUrl = location ? new URL(location, whepUrl).toString() : null;

  const close = () => {
    pc.close();
    if (sessionUrl) {
      fetch(sessionUrl, { method: 'DELETE' }).catch(() => {});
    }
  };

  signal.addEventListener('abort', () => pc.close());

  return { pc, close };
}