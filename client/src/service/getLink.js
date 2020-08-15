import makeRequest from '../utils/makeRequest';

const getLink = async ({ token }) => {
  return makeRequest('getLink', {
    method: 'POST',
    body: { token }
  });
};

export default getLink;
