import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import Board from './components/Board';
import Lobby from './components/Lobby';

const SERVER = process.env.REACT_APP_SERVER_URL || 'http://localhost:4000';

function App() {
  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(null);

  useEffect(() => {
    const s = io(SERVER);
    setSocket(s);
    s.on('connect', () => {
      console.log('connected to server', s.id);
      s.emit('join_lobby', { name: 'Guest' });
    });

    s.on('room_created', (data) => {
      setRoom(data.roomId);
    });

    s.on('match_found', (data) => {
      setRoom(data.roomId);
      // assign playerIndex based on our socket ID vs players list later
    });

    s.on('game_state', (state) => {
      setGameState(state);
      if (state && state.roomId === room) {
        // determine player index from server players mapping: we don't receive players list here,
        // so request? Simple heuristic: server assigned player indices by order in room.players: we'll fetch that via room_update
      }
    });

    s.on('room_update', (data) => {
      // if players available, set our player index
      if (data.players && room && data.players.includes(s.id)) {
        setPlayerIndex(data.players.indexOf(s.id));
      } else if (data.players && room) {
        // maybe we are the second player
        setPlayerIndex(data.players.indexOf(s.id));
      }
      if (data.message) {
        setMessages(m => [...m, { system: true, text: data.message }]);
      }
    });

    s.on('chat', (msg) => {
      setMessages(m => [...m, msg]);
    });

    s.on('invalid_move', (payload) => {
      setMessages(m => [...m, { system: true, text: payload.message }]);
    });

    s.on('game_over', (payload) => {
      setMessages(m => [...m, { system: true, text: `Game over: ${payload.status}${payload.winner !== null ? ', winner: ' + payload.winner : ''}` }]);
    });

    s.on('rematch_started', () => {
      setMessages(m => [...m, { system: true, text: 'Rematch started' }]);
    });

    return () => {
      s.disconnect();
    };
  }, [room]);

  function enterQueue() {
    socket.emit('enter_queue');
  }

  function createRoom() {
    socket.emit('create_room', { name: 'Player' });
  }

  function joinRoom(roomId) {
    socket.emit('join_room', { roomId });
    setRoom(roomId);
  }

  function handlePlay(col) {
    socket.emit('play_move', { column: col });
  }

  function handleChat(text) {
    socket.emit('send_chat', { text });
    setMessages(m => [...m, { from: 'Me', text }]);
  }

  function requestRematch() {
    socket.emit('request_rematch');
  }

  return (
    <div className="app">
      <h1>Connect 4 — Multiplayer</h1>
      {!room && <Lobby enterQueue={enterQueue} createRoom={createRoom} joinRoom={joinRoom} />}
      {room && gameState && (
        <div>
          <div>Room: {room}</div>
          <Board
            board={gameState.board}
            onPlay={handlePlay}
            currentPlayer={gameState.currentPlayerIndex}
            yourIndex={gameState.players ? gameState.players.indexOf(socket?.id) : playerIndex}
            winner={gameState.winner}
            status={gameState.status}
          />
          <div className="controls">
            <button onClick={requestRematch}>Request Rematch</button>
            <Chat messages={messages} onSend={handleChat} />
          </div>
        </div>
      )}
      {room && !gameState && <div>Waiting for opponent...</div>}
    </div>
  );
}

function Chat({ messages, onSend }) {
  const [text, setText] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };
  return (
    <div className="chat">
      <div className="messages" style={{ maxHeight: 200, overflowY: 'auto' }}>
        {messages.map((m, i) => <div key={i} className={m.system ? 'system' : 'msg'}>{m.system ? m.text : `${m.from}: ${m.text}`}</div>)}
      </div>
      <form onSubmit={submit}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Say something..." />
        <button>Send</button>
      </form>
    </div>
  );
}

export default App;
