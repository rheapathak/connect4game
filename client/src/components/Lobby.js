import React, { useState } from 'react';

export default function Lobby({ enterQueue, createRoom, joinRoom }) {
  const [roomId, setRoomId] = useState('');
  return (
    <div className="lobby">
      <h2>Lobby</h2>
      <div>
        <button onClick={enterQueue}>Quick Match (Queue)</button>
        <button onClick={createRoom}>Create Private Room</button>
      </div>
      <div style={{ marginTop: 10 }}>
        <input placeholder="Room ID to join" value={roomId} onChange={e => setRoomId(e.target.value)} />
        <button onClick={() => joinRoom(roomId)}>Join</button>
      </div>
    </div>
  );
}
