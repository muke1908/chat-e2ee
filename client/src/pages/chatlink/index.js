import React, { useState, useEffect } from 'react';
import './style.css';
import { renderGoogleReCaptcha, getCaptchaInstance } from './captcha';
import { getLink } from '../../service';
import Button from '../../components/Button';
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
    renderGoogleReCaptcha(captchaIns, setCaptchToken, 'captcha');
  };

  useEffect(() => {
    initCaptcha();
  }, []);

  return (
    <>
      <div className="app link-generation--page">
        <div className="header">Because privacy matters!</div>
        <div className="section--default">
          <div className="title">Generate temporary link and start chatting without worrying.</div>
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
              <Button
                label="Generate link"
                type="secondary"
                disabled={formBusy ? true : false}
                onClick={generateLink}
                width="200px"
              />
            </>
          )}
          {chatLink && (
            <div className="chat-link captcha-height-setter">
              <LinkDisplay content={chatLink.absoluteLink} />
            </div>
          )}
        </div>
        <div className="section--contribute section--default">
          <div className="title">
            Our source-code is public on&nbsp;
            <a
              href="https://github.com/muke1908/chat-e2ee"
              target="_blank"
              rel="noopener noreferrer"
            >
              Github
            </a>
            , feel free to contribute!
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
