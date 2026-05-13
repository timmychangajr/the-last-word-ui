import React from 'react';
import './BufferUserDisplay.css';
import type { RoomUser } from '../types';

interface BufferUserDisplayProps {
    mainUser: string;
    users: RoomUser[];
}

const BufferUserDisplay: React.FC<BufferUserDisplayProps> = ({ mainUser, users }) => {
    return (
        <div className='user-container'>
            <p className="user-header">Players</p>
            {users.map((user, index) => {
                // Same logic as BufferDisplay: you are the 'poet', others are 'noise'
                const userTypeClass = mainUser === user.username ? 'poet' : 'noise';

                return (
                    <div key={index} className={`user-row ${userTypeClass}`}>
                        <div className='tally'>
                            {user.ready && <span className="ready-indicator">•</span>}
                            <span className="user-name">{user.username}</span>
                            <span className="user-score value">{user.wins || 0}</span>
                        </div>
                        {/* <br /> */}
                        <div className='health'>
                            <span className="user-score">Health</span>
                            <br/>
                            <span className="user-score value">{user.score || 0} HP</span>
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

export default BufferUserDisplay;