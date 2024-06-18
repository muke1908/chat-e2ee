import React, { useRef, useEffect } from "react";

type NotificationProps = {
  play: boolean;
  audio: any;
};

const Notification = ({ play, audio }: NotificationProps) => {
  const audioFile = useRef<HTMLAudioElement | null>(null);
  const playAudio = () => {
    if (audioFile.current !== null) {
      const audioPromise = audioFile.current.play();
      audioPromise.catch((err) => console.error(err));
    }
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
