import React, { useState, useEffect } from 'react';
import './style.css';
import { Link } from 'react-router-dom';
import { renderGoogleReCaptcha, getCaptchaInstance } from './captcha';
import { getLink } from '../../service';
import Button from '../../components/Button.js';
import LinkDisplay from '../../components/LinkDisplay/index.js';

const App = () => {
  const [chatLink, setChatLink] = useState('');
  const [captchaToken, setCaptchToken] = useState(null);
  const [loading, setLoading] = useState(false);

  const formBusy = !captchaToken || loading;

  const generateLink = async () => {
    // TODO: handle error
    // TODO: handle captcha expiration
    if (formBusy) {
      return;
    }

    setLoading(true);
    const linkResp = await getLink({ token: captchaToken });
    setChatLink(linkResp);
    setLoading(false);
  };
  const initCaptcha = async () => {
    const captchaIns = await getCaptchaInstance();
    renderGoogleReCaptcha(captchaIns, setCaptchToken);
  };

  useEffect(() => {
    initCaptcha();
  }, []);

  return (
    <div className="app link-generation--page">
      <div className="header">Generate temporary link and start chatting without worrying.</div>
      <div className="section--default">
        <div className="title">Because privacy matters</div>
        <div className="description">
          <ul>
            <li>No login/signup required.</li>
            <li>We don't track you.</li>
            <li>
              Your messages are <b>end-to-end</b> encrypted - technically impossible to read your
              messages by someone else.
            </li>
          </ul>
        </div>
        {!chatLink && (
          <>
            <div id="captcha" className="captcha-height-setter"></div>
            <br />
            {/* <div
              className={(formBusy ? 'disabled' : '') + ' generate-link-btn'}
              onClick={generateLink}
            >
              Generate link
            </div> */}
            <Button
              label="Generate link"
              type="secondary"
              disabled={formBusy ? true : false}
              onClick={generateLink}
              width="200px"
            />
            <LinkDisplay content="this is supposed to be a url" />
          </>
        )}
        {chatLink && (
          <div className="chat-link captcha-height-setter">
            <Link to={chatLink.link}>{chatLink.absoluteLink}</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
