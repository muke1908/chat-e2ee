import React, { useRef, useEffect } from 'react';

const Notification = ({ play, audio }) => {
  const audioFile = useRef(null);
  const playAudio = () => {
    const audioPromise = audioFile.current.play();
    audioPromise.catch((err) => console.error(err));
  };

  useEffect(() => {
    play && playAudio();
  }, [play, audio]);

  return (
    <audio ref={audioFile}>
      <source src={audio} />
    </audio>
  );
};
export default Notification;
