const AUDIO_SAMPLE_RATE = 44100;

export const createBrowserAudioContext = () => {
  const AudioContextConstructor =
    window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error('AudioContext no disponible en este navegador');
  }

  return new AudioContextConstructor({
    sampleRate: AUDIO_SAMPLE_RATE,
  });
};

export const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const dataLength = buffer.length * numberOfChannels * bytesPerSample;
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (dataView: DataView, offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      dataView.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  const channels = Array.from({ length: numberOfChannels }, (_, channel) =>
    buffer.getChannelData(channel)
  );

  let byteOffset = 44;
  for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex += 1) {
    for (let channel = 0; channel < numberOfChannels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][sampleIndex]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(byteOffset, intSample, true);
      byteOffset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

export const mergeAudioSegmentsToWav = async (segments: Blob[]): Promise<Blob> => {
  if (segments.length === 0) {
    throw new Error('No hay segmentos de audio para combinar');
  }

  if (segments.length === 1) {
    return segments[0];
  }

  const audioContext = createBrowserAudioContext();

  try {
    const buffers = await Promise.all(
      segments.map(async (segment) => {
        const arrayBuffer = await segment.arrayBuffer();
        return audioContext.decodeAudioData(arrayBuffer.slice(0));
      })
    );

    const channelCount = Math.max(...buffers.map((buffer) => buffer.numberOfChannels));
    const totalLength = buffers.reduce((length, buffer) => length + buffer.length, 0);
    const mergedBuffer = audioContext.createBuffer(
      channelCount,
      totalLength,
      audioContext.sampleRate
    );

    let offset = 0;
    for (const buffer of buffers) {
      for (let channel = 0; channel < channelCount; channel += 1) {
        const sourceChannel = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1));
        mergedBuffer.getChannelData(channel).set(sourceChannel, offset);
      }
      offset += buffer.length;
    }

    return audioBufferToWav(mergedBuffer);
  } finally {
    await audioContext.close();
  }
};
