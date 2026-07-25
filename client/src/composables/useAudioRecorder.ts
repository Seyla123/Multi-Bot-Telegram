import { ref, onUnmounted } from 'vue';

export function useAudioRecorder() {
  const isRecording = ref(false);
  const recordingDuration = ref(0);
  const audioUrl = ref<string | null>(null);
  const audioBlob = ref<Blob | null>(null);
  
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let stream: MediaStream | null = null;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        audioBlob.value = blob;
        audioUrl.value = URL.createObjectURL(blob);
      };

      mediaRecorder.start();
      isRecording.value = true;
      recordingDuration.value = 0;
      
      timerInterval = setInterval(() => {
        recordingDuration.value++;
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please ensure permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    isRecording.value = false;
  };

  const cancelRecording = () => {
    stopRecording();
    audioChunks = [];
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value);
    }
    audioUrl.value = null;
    audioBlob.value = null;
    recordingDuration.value = 0;
  };

  onUnmounted(() => {
    cancelRecording();
  });

  return {
    isRecording,
    recordingDuration,
    audioUrl,
    audioBlob,
    formatDuration,
    startRecording,
    stopRecording,
    cancelRecording
  };
}
