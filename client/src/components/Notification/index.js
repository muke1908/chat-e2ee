import React from 'react';

const Notification = (props) => {
  function playAudio() {
    const audio = document.getElementsByClassName('audio-component');
    audio.play();
  }
  const [play, setPlay] = React.useState(props.play);

  if (play) {
    setPlay(false);
    playAudio();
    if (!play) {
      setPlay(true);
      playAudio();
    }
  }

  return (
    <div>
      <audio class="audio-component">
        <source src={props.audio}></source>
      </audio>
    </div>
  );
};
export default Notification;
