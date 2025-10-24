class RacingGame {
    constructor() {
        this.players = [];
        this.destination = 2000;
        this.currentPlayerIndex = 0;
        this.gameHistory = []; // For undo functionality
        this.gameActive = false;
        this.gameFinished = false;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Setup phase
        document.getElementById('set-players-btn').addEventListener('click', () => this.setPlayers());
        document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());

        // Game phase
        document.getElementById('make-move-btn').addEventListener('click', () => this.makeMove());
        document.getElementById('move-distance').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.makeMove();
        });

        // Control buttons
        document.getElementById('reset-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('undo-btn').addEventListener('click', () => this.undoLastMove());
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());

        // Input validation
        document.getElementById('destination').addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            if (value < 1000) e.target.value = 1000;
        });


        document.getElementById('move-distance').addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            if (value < 0) e.target.value = '';
            // Remove the 50m limit - players can move any distance they want
        });
    }

    setPlayers() {
        const numPlayers = parseInt(document.getElementById('num-players').value);
        const nameInputsDiv = document.getElementById('name-inputs');
        const startBtn = document.getElementById('start-game-btn');

        // Clear previous inputs
        nameInputsDiv.innerHTML = '';

        // Create name input fields
        for (let i = 0; i < numPlayers; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'name-input-group';

            const label = document.createElement('label');
            label.textContent = `Player ${i + 1}:`;

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Enter name for Player ${i + 1}`;
            input.value = `Player ${i + 1}`;
            input.maxLength = 20;

            inputGroup.appendChild(label);
            inputGroup.appendChild(input);
            nameInputsDiv.appendChild(inputGroup);
        }

        // Show the name inputs and start button
        document.getElementById('player-names').classList.remove('hidden');
        startBtn.classList.remove('hidden');
    }

    startGame() {
        const nameInputs = document.querySelectorAll('#name-inputs input');
        const destination = parseInt(document.getElementById('destination').value);

        // Validate destination
        if (isNaN(destination) || destination < 1000) {
            alert('Please enter a valid destination of at least 1000 meters!');
            return;
        }

        // Validate player names
        const playerNames = Array.from(nameInputs).map(input => input.value.trim());
        if (playerNames.some(name => name === '')) {
            alert('Please enter names for all players!');
            return;
        }

        // Check for duplicate names
        const uniqueNames = new Set(playerNames);
        if (uniqueNames.size !== playerNames.length) {
            alert('Please use unique names for all players!');
            return;
        }

        // Initialize game
        this.destination = destination;
        this.players = playerNames.map((name, index) => ({
            name,
            position: 0,
            color: this.getPlayerColor(index),
            character: this.getPlayerCharacter(index),
            finished: false,
            finishPosition: null,
            lastMoveRound: 0
        }));

        this.currentPlayerIndex = 0;
        this.gameHistory = [];
        this.gameActive = true;
        this.gameFinished = false;
        this.currentRound = 1;
        this.someoneFinishedInRound = null;

        // Disable destination input during game
        document.getElementById('destination').disabled = true;

        // Hide setup and show game
        document.getElementById('setup-section').classList.add('hidden');
        document.getElementById('game-section').classList.remove('hidden');

        // Initialize game UI
        this.updateGameUI();
        this.createRacingTrack();
        this.updateGameStatus('Game started! It\'s ' + this.players[0].name + '\'s turn.');

        document.getElementById('current-player').textContent = this.players[this.currentPlayerIndex].name;
        document.getElementById('current-player').style.color = this.players[this.currentPlayerIndex].color;

        // Highlight current player's lane
        this.players.forEach((_, index) => {
            const lane = document.getElementById(`player-${index}-lane`);
            if (lane) {
                if (index === this.currentPlayerIndex) {
                    lane.style.boxShadow = '0 0 15px ' + this.players[index].color;
                    lane.style.transform = 'scale(1.02)';
                } else {
                    lane.style.boxShadow = 'none';
                    lane.style.transform = 'scale(1)';
                }
            }
        });
    }

    getPlayerColor(index) {
        const colors = ['#ff4757', '#2ed573', '#3742fa', '#ffa502', '#ff6b81', '#9c88ff'];
        return colors[index % colors.length];
    }

    getPlayerLaneColor(index) {
        const laneColors = ['#ffe8e8', '#e8ffe8', '#e8e8ff', '#fff5e8', '#ffe8f0', '#f0e8ff'];
        return laneColors[index % laneColors.length];
    }

    getPlayerTrailColor(index) {
        // Use the same vibrant colors as the main player colors for better visibility
        return this.getPlayerColor(index);
    }

    getPlayerCharacter(index) {

        const characters = [
            '🏃‍♂️', '🏃‍♀️', '🚴‍♂️', '🚴‍♀️', '🏎️', '🚗', '🚙', '🚕',
            '🏇', '🛴', '🏂', '🏄‍♂️', '🏄‍♀️', '🚤', '🛵', '🏃'
        ];
        // Random icon
        const randomIndex = Math.floor(Math.random() * characters.length);
        return characters[randomIndex];
    }

    createRacingTrack() {
        const trackDiv = document.getElementById('players-track');
        const markersDiv = document.getElementById('distance-markers');

        // Clear previous content
        trackDiv.innerHTML = '';
        markersDiv.innerHTML = '';

        // Create distance markers
        const numMarkers = Math.min(10, Math.max(5, Math.floor(this.destination / 20)));
        for (let i = 0; i <= numMarkers; i++) {
            const marker = document.createElement('div');
            marker.className = 'distance-marker';
            marker.textContent = Math.round((i / numMarkers) * this.destination) + 'm';
            markersDiv.appendChild(marker);
        }

        // Create player lanes
        this.players.forEach((player, index) => {
            // Create container for player info and lane
            const playerContainer = document.createElement('div');
            playerContainer.className = 'player-container';

            // Create player info (outside the lane)
            const playerInfo = document.createElement('div');
            playerInfo.className = 'player-info';
            playerInfo.id = `player-${index}-info`;
            playerInfo.textContent = `${player.name}: ${player.position}m`;
            playerInfo.style.backgroundColor = player.color;
            playerInfo.style.color = this.getContrastColor(player.color);

            // Create the racing lane
            const lane = document.createElement('div');
            lane.className = 'player-lane';
            lane.id = `player-${index}-lane`;
            lane.style.backgroundColor = this.getPlayerLaneColor(index);
            lane.style.borderColor = player.color;

            const playerTrail = document.createElement('div');
            playerTrail.className = 'player-trail';
            playerTrail.id = `player-${index}-trail`;
            const trailColor = this.getPlayerTrailColor(index);
            playerTrail.style.backgroundColor = trailColor;
            playerTrail.style.width = '0px'; // Start with no trail

            const playerChar = document.createElement('div');
            playerChar.className = 'player-character';
            playerChar.textContent = player.character;
            playerChar.style.left = '10px'; // Start position

            const finishLine = document.createElement('div');
            finishLine.className = 'finish-line';

            lane.appendChild(playerTrail);
            lane.appendChild(playerChar);
            lane.appendChild(finishLine);

            playerContainer.appendChild(playerInfo);
            playerContainer.appendChild(lane);
            trackDiv.appendChild(playerContainer);
        });

        document.getElementById('game-destination').textContent = this.destination;
    }

    getContrastColor(backgroundColor) {
        // Simple contrast calculation
        const hex = backgroundColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#000' : '#fff';
    }

    makeMove() {
        if (!this.gameActive || this.gameFinished) return;

        const tmpMoveDistance = document.getElementById('move-distance').value;
        const moveDistance = parseInt(tmpMoveDistance == "" ? 0 : tmpMoveDistance);
        const currentPlayer = this.players[this.currentPlayerIndex];

        if (moveDistance < 0) {
            this.updateGameStatus('Invalid move! Distance cannot be negative.', 'warning');
            return;
        }

        // Removed the 50m limit - players can move any distance they want

        // Save current state for undo
        this.saveCurrentState();

        // Update player position and track their move
        const oldPosition = currentPlayer.position;
        currentPlayer.position += moveDistance;
        currentPlayer.lastMoveRound = this.currentRound;

        // Check if player finished
        if (currentPlayer.position >= this.destination && !currentPlayer.finished) {
            currentPlayer.finished = true;
            const finishedCount = this.players.filter(p => p.finished).length;
            currentPlayer.finishPosition = finishedCount;

            // Track the round when someone first finished
            if (this.someoneFinishedInRound === null) {
                this.someoneFinishedInRound = this.currentRound;
            }
        }

        // Update UI
        this.updatePlayerPosition(this.currentPlayerIndex);
        this.updatePlayerInfo(this.currentPlayerIndex);

        // Check if game is finished
        if (this.checkGameFinished()) {
            this.finishGame();
            return;
        }

        // Move to next player and check if round is complete
        const wasLastPlayerInRound = this.currentPlayerIndex === this.players.length - 1;
        this.nextPlayer();

        // If we completed a round, increment round counter
        if (wasLastPlayerInRound) {
            this.currentRound++;
        }

        // Clear input and update UI
        document.getElementById('move-distance').value = "";
        this.updateGameUI();

        // Enable undo button
        document.getElementById('undo-btn').disabled = false;

        this.updateGameStatus(
            `${currentPlayer.name} moved ${moveDistance}m (${oldPosition}m → ${currentPlayer.position}m). ` +
            `It's now ${this.players[this.currentPlayerIndex].name}'s turn.`
        );
    }

    saveCurrentState() {
        const state = {
            players: JSON.parse(JSON.stringify(this.players)),
            currentPlayerIndex: this.currentPlayerIndex,
            gameActive: this.gameActive,
            gameFinished: this.gameFinished
        };
        this.gameHistory.push(state);

        // Limit history to last 20 moves to prevent memory issues
        if (this.gameHistory.length > 20) {
            this.gameHistory.shift();
        }
    }

    undoLastMove() {
        if (this.gameHistory.length === 0) return;

        const previousState = this.gameHistory.pop();
        this.players = previousState.players;
        this.currentPlayerIndex = previousState.currentPlayerIndex;
        this.gameActive = previousState.gameActive;
        this.gameFinished = previousState.gameFinished;

        // Update UI
        this.updateAllPlayerPositions();
        this.updateAllPlayerInfo();
        this.updateGameUI();

        if (this.gameHistory.length === 0) {
            document.getElementById('undo-btn').disabled = true;
        }

        this.updateGameStatus(`Undo successful! It's ${this.players[this.currentPlayerIndex].name}'s turn.`);
    }

    updatePlayerPosition(playerIndex) {
        const player = this.players[playerIndex];
        const playerChar = document.querySelector(`#player-${playerIndex}-lane .player-character`);
        const playerTrail = document.getElementById(`player-${playerIndex}-trail`);
        const lane = document.getElementById(`player-${playerIndex}-lane`);

        if (!playerChar || !lane || !playerTrail) return;

        const laneWidth = lane.offsetWidth - 60; // Account for padding and character width
        const progressPercent = Math.min(player.position / this.destination, 1);
        const newLeft = 10 + (progressPercent * laneWidth);

        // Update character position
        playerChar.style.left = newLeft + 'px';

        // Update trail to show traveled path
        const trailWidth = Math.max(0, newLeft - 10); // Trail starts from beginning
        playerTrail.style.width = trailWidth + 'px';

        // Add visual effect if player finished
        if (player.finished && player.finishPosition === 1) {
            playerChar.style.animation = 'bounce 0.5s ease-in-out 3';
            playerTrail.style.boxShadow = '0 0 10px ' + player.color;
        }
    }

    updatePlayerInfo(playerIndex) {
        const player = this.players[playerIndex];
        const playerInfo = document.getElementById(`player-${playerIndex}-info`);

        if (!playerInfo) return;

        let statusText = `${player.name}: ${player.position}m`;
        if (player.finished) {
            statusText += ` (Finished #${player.finishPosition})`;
        }

        playerInfo.textContent = statusText;
    }

    updateAllPlayerPositions() {
        this.players.forEach((_, index) => {
            this.updatePlayerPosition(index);
        });
    }

    resetPlayerTrails() {
        this.players.forEach((_, index) => {
            const playerTrail = document.getElementById(`player-${index}-trail`);
            if (playerTrail) {
                playerTrail.style.width = '0px';
                playerTrail.style.boxShadow = 'none';
            }
        });
    }

    updateAllPlayerInfo() {
        this.players.forEach((_, index) => {
            this.updatePlayerInfo(index);
        });
    }

    nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;

        // Skip finished players, but only if we haven't reached the end of a finishing round
        if (this.players[this.currentPlayerIndex].finished &&
            this.someoneFinishedInRound !== null &&
            this.players[this.currentPlayerIndex].lastMoveRound >= this.someoneFinishedInRound) {

            // Find next unfinished player or cycle back to start
            let attempts = 0;
            while (this.players[this.currentPlayerIndex].finished && attempts < this.players.length) {
                this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
                attempts++;
            }
        }
    }

    checkGameFinished() {
        // Game finishes only if someone finished AND all players have completed their turn in that round
        if (this.someoneFinishedInRound === null) {
            return false; // No one has finished yet
        }

        // Check if all players have had their turn in the round where someone finished
        const allPlayersCompletedFinishingRound = this.players.every(player =>
            player.lastMoveRound >= this.someoneFinishedInRound
        );

        return allPlayersCompletedFinishingRound;
    }

    finishGame() {
        this.gameFinished = true;
        this.gameActive = false;

        // Hide game section and show winner section
        document.getElementById('game-section').classList.add('hidden');
        document.getElementById('winner-section').classList.remove('hidden');

        // Display final results
        this.displayFinalResults();
    }

    displayFinalResults() {
        const resultsDiv = document.getElementById('final-results');
        resultsDiv.innerHTML = '';

        // Sort players by finish position (finished players first, then by position)
        const sortedPlayers = [...this.players].sort((a, b) => {
            if (a.finished && !b.finished) return -1;
            if (!a.finished && b.finished) return 1;
            if (a.finished && b.finished) return a.finishPosition - b.finishPosition;
            return b.position - a.position; // For unfinished players, sort by distance
        });

        sortedPlayers.forEach((player, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';

            if (player.finished) {
                if (player.finishPosition === 1) {
                    resultItem.classList.add('winner');
                    resultItem.innerHTML = `🏆 ${player.name} - WINNER! (${player.position}m)`;
                } else {
                    resultItem.classList.add('completed');
                    resultItem.innerHTML = `${player.finishPosition}. ${player.name} - Finished (${player.position}m)`;
                }
            } else {
                resultItem.classList.add('not-completed');
                resultItem.innerHTML = `${player.name} - Did not finish (${player.position}m)`;
            }

            resultsDiv.appendChild(resultItem);
        });
    }

    updateGameUI() {
        if (!this.gameActive) return;

        document.getElementById('current-player').textContent = this.players[this.currentPlayerIndex].name;
        document.getElementById('current-player').style.color = this.players[this.currentPlayerIndex].color;

        // Highlight current player's lane
        this.players.forEach((_, index) => {
            const lane = document.getElementById(`player-${index}-lane`);
            if (lane) {
                if (index === this.currentPlayerIndex) {
                    lane.style.boxShadow = '0 0 15px ' + this.players[index].color;
                    lane.style.transform = 'scale(1.02)';
                } else {
                    lane.style.boxShadow = 'none';
                    lane.style.transform = 'scale(1)';
                }
            }
        });
    }

    updateGameStatus(message, type = 'info') {
        const statusDiv = document.getElementById('game-status');
        statusDiv.textContent = message;

        // Remove previous status classes
        statusDiv.classList.remove('status-info', 'status-warning', 'status-success');

        // Add appropriate class
        switch (type) {
            case 'warning':
                statusDiv.classList.add('status-warning');
                break;
            case 'success':
                statusDiv.classList.add('status-success');
                break;
            default:
                statusDiv.classList.add('status-info');
        }
    }

    resetGame() {
        this.players.forEach((_, index) => {
            this.players[index].position = 0;
            this.players[index].lastMoveRound = 1;
            this.updatePlayerPosition(index);
        });

        this.currentPlayerIndex = 0;
        this.gameHistory = [];
        this.gameActive = true;
        this.gameFinished = false;
        this.currentRound = 1;
        this.someoneFinishedInRound = null;

        document.getElementById('undo-btn').disabled = true;

        this.updateGameUI();
        this.createRacingTrack();
        this.updateGameStatus('Game started! It\'s ' + this.players[0].name + '\'s turn.');
    }

    newGame() {
        if (confirm('Are you sure you want to reset the game? All progress will be lost.')) {
            this.gameActive = false;
            this.gameFinished = false;
            this.players = [];
            this.gameHistory = [];

            // Reset UI
            document.getElementById('game-section').classList.add('hidden');
            document.getElementById('winner-section').classList.add('hidden');
            document.getElementById('setup-section').classList.remove('hidden');
            document.getElementById('player-names').classList.add('hidden');
            document.getElementById('start-game-btn').classList.add('hidden');

            // Clear inputs and reset to defaults
            document.getElementById('num-players').value = 2;
            document.getElementById('destination').value = 100;
            document.getElementById('move-distance').value = 0;
            document.getElementById('name-inputs').innerHTML = '';

            // Re-enable destination input
            document.getElementById('destination').disabled = false;

            this.updateGameStatus('Game reset. Please set up a new game.');
        }
    }
}

// Add some CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes bounce {
        0%, 20%, 60%, 100% {
            transform: translateY(-50%);
        }
        40% {
            transform: translateY(-70%);
        }
        80% {
            transform: translateY(-60%);
        }
    }
    
    @keyframes pulseTrail {
        0%, 100% {
            opacity: 0.8;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        50% {
            opacity: 0.9;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
    }
    
    @keyframes shimmer {
        0% {
            background-position: -200% 0;
        }
        100% {
            background-position: 200% 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new RacingGame();
});
