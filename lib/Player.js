const getMP3Duration = require('get-mp3-duration');
const fs = require('fs');

class Player {

    constructor(config, files) {
        this.player = null;
        this.config = config;
        this.files = files;
        this.nowPlaying = {
			player: null,
			playing: false,
			title: 'Nothing is currently playing',
            thumbnail: 'http://www.scottishculture.org/themes/scottishculture/images/music_placeholder.png'
		}
        this.playerActive = false;
        this.playedFor = 0;
        this.interval;
    }



    getPlayer() {
        return this.player;
    }

    np() {
        return this.nowPlaying;
    }

    destroy() {
        if (this.player) {
            this.player.pause();
        }
        document.getElementById(this.nowPlaying.title).src = "../static/icons/play.svg";
        document.getElementById('title').innerText = 'Nothing is currently playing';
        document.getElementById('sl').innerText = '00:00';
        document.getElementById('ct').innerText = '00:00';
        document.getElementById('progress-bar').style.width = '0%';
        clearInterval(this.interval);
        this.playedFor = 0;
        this.player = null;
        this.playerActive = false;
        return this.player;
    }

    play = (file) => {
        if (this.player) {
            this.destroy();
            clearInterval(this.interval);
            this.playedFor = 0;
			this.player = null;
        }
        document.getElementById(file).src = "../static/icons/pause.svg";
        document.getElementById('title').innerText = file;
        document.getElementById('pause').src = "../static/icons/pause.svg";
        this.player = new Audio(this.config.path + file);
        this.interval = setInterval(() => {
            if (!this.player.paused) {
                this.playedFor++
                document.getElementById('progress-bar').style.width = this.getCurrentTimePercentage(file) + '%';
                document.getElementById('ct').innerText = this.getCurrentTime();
            }
        }, 1000)
        document.getElementById('sl').innerText = this.getDuration(file);
        this.playerActive = true;
        this.player.play();
        this.nowPlaying = {
			player: this.player,
			...this.nowPlaying,
			playing: true,
			title: file
		}
    }

    pause() {
		if (!this.player) return;
        switch (this.player.paused) {
            case true:
                document.getElementById('pause').src = "../static/icons/pause.svg";
                this.player.play();
            break;
            case false:
                document.getElementById('pause').src = "../static/icons/play.svg";
                this.player.pause();
            break;
        }
    }

    skip() {
        if (!this.player) return;
        let title = this.np().title;
		let currentPosition = this.files.map(f => f).indexOf(title);
		let nextPosition = currentPosition + 2 > this.files.length ? 0 : currentPosition + 1;

		this.play(this.files[nextPosition]);
    }

    previous() {
		if (!this.player) return;
        let title = this.np().title;
		let currentPosition = this.files.map(f => f).indexOf(title);
		let previousPosition = currentPosition === 0 ? this.files.length - 1 : currentPosition - 1;

		this.play(this.files[previousPosition]);
    }

    // Helpers
    getDuration(file, formatted = true) {
        if (!this.player) return '00:00';
        const buffer = fs.readFileSync(this.config.path + file);
        return formatted ? this.formatDuration(getMP3Duration(buffer)) : getMP3Duration(buffer);
    }

    getCurrentTime(formatted = true) {
        return formatted ? this.formatDuration(this.playedFor * 1000) : this.playedFor * 1000;
    }

    getCurrentTimePercentage(file) {
        let length = this.getDuration(file, false);
        let current = this.getCurrentTime(false);
        return ((current / length) * 100).toFixed(1);
    }

    formatDuration(ms) {
        let seconds = parseInt((ms / 1000) % 60);
        let minutes = parseInt((ms / (1000 * 60)) % 60);
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        seconds = (seconds < 10) ? "0" + seconds : seconds;

        return minutes + ":" + seconds;
    }


}

module.exports = Player