import React from 'react';
import { AudioRecorder } from 'react-audio-voice-recorder';

import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';


const AudioRecorderModal = ({ onStop }) => {
  // Removed unused state variables: mediaRecorder, isRecording

  // useEffect(() => {
  //   navigator.mediaDevices.getUserMedia({ audio: true })
  //     .then(stream => {
  //       console.log("StreaM", stream)
  //       const recorder = new MediaRecorder(stream);
  //       setMediaRecorder(recorder);
  //       console.log("recorder", recorder)

  //       recorder.ondataavailable = event => {
  //         if (onStop) onStop(event.data);
  //       };
  //     });
  // }, []);

  // const startRecording = () => {
  //   if (mediaRecorder !== null) {
  //     mediaRecorder.start();
  //     setIsRecording(true);
  //   } else {
  //     alert("No recorder?")
  //   }
  // };

  // const stopRecording = () => {
  //   console.log(mediaRecorder);
  //   if (mediaRecorder) {
  //     mediaRecorder.stop();
  //     setIsRecording(false);
  //     mediaRecorder.stream.getTracks().forEach(track => track.stop());
  //   }
  // };

  return (
    <Paper style={styles.modalStyle}>
      <AudioRecorder 
        showVisualizer
        downloadOnSavePress={false}
        onRecordingComplete={onStop}
        audioTrackConstraints={{
          noiseSuppression: true,
          echoCancellation: true,
        }}
        downloadFileExtension="mp4"
      />
      <Typography variant="h4" component="h4">
        Press the button to start recording
      </Typography>
      {/* <Button variant="contained" onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </Button> */}
    </Paper>
  );
};

const styles = {
  modalStyle: {
    marginTop: '22px',
    // Add more styling as per your need
  },
};

export default AudioRecorderModal;
