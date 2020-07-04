import makeRequest from '../utils/request';

const getLink = async ({ token }) => {
  return makeRequest('getLink', {
    method: 'POST',
    body: { token }
  });
};

export default getLink;
