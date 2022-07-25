class Player {

    constructor(config, files) {
        this.player = null;
        this.config = config;
        this.files = files;
        this.nowPlaying = {
            player: null,
            playing: false,
            duration: 0,
            title: 'Nothing is currently playing',
            thumbnail: '../static/img/placeholder.png'
        }
        this.playedFor = 0;
        this.interval;
        this.loop = false;
        this.dragging = false;
    }



    getPlayer() {
        return this.player;
    }

    np() {
        return this.nowPlaying;
    }

    destroy() {
        if (!this.player) return;
        this.player.pause();
        document.getElementById('slider').value = 0;
        document.getElementById(this.nowPlaying.title).src = "../static/icons/play.svg";
        document.getElementById('title').innerText = 'Nothing is currently playing';
        document.getElementById('sl').innerText = '00:00';
        document.getElementById('ct').innerText = '00:00';
        document.getElementById('progress-bar').style.width = '0%';
        clearInterval(this.interval);
        this.playedFor = 0;
        this.player = null;
        return this.nowPlaying;
    }

    async play(file, thumb) {
        if (this.player) {
            this.destroy();
            clearInterval(this.interval);
            this.playedFor = 0;
            this.player = null;
        }
        document.getElementById('slider').max = 100;
        document.getElementById(file).src = "../static/icons/pause.svg";
        document.getElementById('title').innerText = file;
        document.getElementById('pause').src = "../static/icons/pause.svg";
        this.player = new Audio(this.config.path + file);
        this.player.onended = () => {
            if (!this.player.loop) this.destroy();
        }
        this.player.ontimeupdate = () => {
            if (this.player && !this.player.paused) {
                if (!this.dragging) {
                    document.getElementById('progress-bar').style.width = this.getCurrentTimePercentage() + '%';
                    document.getElementById('slider').value = this.getCurrentTimePercentage();
                    document.getElementById('ct').innerText = this.getCurrentTime(true);
                }
            }
        }

        // Wait for player to start before getting duration
        this.player.play().then(async () => {
            document.getElementById('sl').innerText = this.getDuration(true);
            this.nowPlaying.duration = this.player.duration;
        });
        this.nowPlaying = {
            player: this.player,
            ...this.nowPlaying,
            playing: true,
            title: file
        }
        if (thumb) {
            document.getElementById('thumbnail').src = thumb;
        }
        return this.nowPlaying;
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
        return this.player.paused;
    }

    async skip() {
        if (!this.player) return;
        let title = this.np().title;
        let currentPosition = this.files.map(f => f).indexOf(title);
        let nextPosition = currentPosition + 2 > this.files.length ? 0 : currentPosition + 1;
        await this.play(this.files[nextPosition]);
        return this.nowPlaying;
    }

    async previous() {
        if (!this.player) return;
        let title = this.np().title;
        let currentPosition = this.files.map(f => f).indexOf(title);
        let previousPosition = currentPosition === 0 ? this.files.length - 1 : currentPosition - 1;
        await this.play(this.files[previousPosition]);
        return this.nowPlaying;
    }

    loopSong() {
        if (!this.player) return;
        switch (this.player.loop) {
            case true:
                document.getElementById('loop').src = "../static/icons/loop.svg";
                this.player.loop = false;
                break;
            case false:
                document.getElementById('loop').src = "../static/icons/loop1.svg";
                this.player.loop = true;
                break;
        }
        return this.player.paused;
    }

    async seek(event) {
        if (!this.player) {
            document.getElementById('slider').max = 0;
            return;
        }
        this.dragging = true;
        let value = event.srcElement.value;
        document.getElementById('ct').innerText = this.formatDuration(this.calculateInverse(value, this.player.duration * 1000) * 1000);
        document.getElementById('progress-bar').style.transition = 'none';
        document.getElementById('progress-bar').style.width = value + '%';
    }

    async stopSeek(event) {
        if (!this.player) return;
        document.getElementById('progress-bar').style.transition = 'none';
        let value = event.srcElement.value;
        this.player.currentTime = this.calculateInverse(value, this.player.duration * 1000)
        this.playedFor = this.player.currentTime;
        document.getElementById('progress-bar').style.width = await this.getCurrentTimePercentage() + '%';
        document.getElementById('ct').innerText = this.getCurrentTime(true);
        this.dragging = false;
        return this.dragging;
    }

    // Helpers
    getDuration(formatted = true) {
        if (!this.player) return '00:00';
        let dur = formatted ? this.formatDuration(this.player.duration * 1000) : this.player.duration * 1000;
        return dur;
    }

    getCurrentTime(formatted = true) {
        return formatted ? this.formatDuration(this.player.currentTime * 1000) : this.player.currentTime * 1000;
    }
    calculateInverse(percent, max) {
        return ((percent / 100) * (max / 1000)).toFixed(0);
    }
    getCurrentTimePercentage(reverse = false) {
        let length = this.player.duration * 1000;
        let current = this.player.currentTime * 1000;
        return reverse ? ((current * length) / 100).toFixed(1) : ((current / length) * 100).toFixed(1);
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
module.exports.getSpotifyData = async (trun, host) => {
    let data = await fetch(`${host}/search?q=${trun}&limit=1`);
    let json = await data.json()
    let search = Array.from(json.search);
    console.log(json, search[0].track, search.length);
    if (search.length == 0) return
    return search[0].track
}