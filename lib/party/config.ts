// Only these public connection URLs are passed into the client. No secret crosses the boundary.
export function partyConnection() {
  const server = process.env.PARTY_SERVER_URL?.replace(/\/$/, '');
  return {
    endpoint: server || (process.env.NODE_ENV === 'development' ? 'local' : ''),
    socketEndpoint: process.env.PARTY_WS_URL?.replace(/\/$/, '') || '',
  };
}
