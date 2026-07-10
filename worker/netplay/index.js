/* dk-netplay — tiny WebSocket relay for DOGE BRAWL online multiplayer.
   One Durable Object per room code; it just forwards messages between the
   two connected players (host runs the match, guest sends inputs).

   Deploy:  cd worker/netplay && npx wrangler deploy
   The client hits  wss://dk-netplay.<account>.workers.dev/ws?room=CODE&role=host|guest
*/
export class Room {
  constructor(state) { this.state = state; }
  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket')
      return new Response('expected websocket', { status: 400 });
    const url = new URL(req.url);
    const role = url.searchParams.get('role') === 'host' ? 'host' : 'guest';
    const socks = this.state.getWebSockets();
    if (socks.length >= 2)
      return new Response('room full', { status: 409 });
    if (role === 'guest' && socks.length === 0)
      return new Response('no such room', { status: 404 });
    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1], [role]); // hibernation API
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  webSocketMessage(ws, msg) {
    if (typeof msg === 'string' && msg.length > 4096) return; // sanity cap
    for (const other of this.state.getWebSockets())
      if (other !== ws) { try { other.send(msg); } catch (e) {} }
  }
  webSocketClose(ws) {
    for (const other of this.state.getWebSockets())
      if (other !== ws) {
        try { other.send('{"t":"bye"}'); } catch (e) {}
        try { other.close(1000, 'peer left'); } catch (e) {}
      }
  }
  webSocketError(ws) { this.webSocketClose(ws); }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/')
      return new Response('dk-netplay ok', { headers: { 'access-control-allow-origin': '*' } });
    if (url.pathname === '/ws') {
      const room = (url.searchParams.get('room') || '')
        .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (room.length < 4) return new Response('bad room code', { status: 400 });
      return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(req);
    }
    return new Response('not found', { status: 404 });
  }
};
