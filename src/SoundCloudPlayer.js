import React, { Component } from 'react'
import isEqual from 'react-fast-compare'
import { propTypes, defaultProps } from './props'
import SoundCloud from './SoundCloud'

const SEEK_ON_PLAY_EXPIRY = 5000

export default class SoundCloudPlayer extends Component {
  static displayName = 'SoundCloudPlayer'
  static propTypes = propTypes
  static defaultProps = defaultProps
  mounted = false
  isReady = false
  isPlaying = false // Track playing state internally to prevent bugs
  isLoading = true // Use isLoading to prevent onPause when switching URL
  loadOnReady = null
  startOnPlay = true
  seekOnPlay = null
  onDurationCalled = false
  // Use references, as refs is used by React
  references = {
    wrapper: wrapper => { this.wrapper = wrapper },
    player: player => { this.player = player }
  }

  componentDidMount () {
    this.mounted = true
  }

  componentWillUnmount () {
    clearTimeout(this.progressTimeout)
    clearTimeout(this.durationCheckTimeout)
    this.mounted = false
  }

  componentDidUpdate (prevProps) {
    // Invoke player methods based on changed props
    const { url, tracks, playing, volume, muted } = this.props
    if (!isEqual(prevProps.url, url)) {
      if (this.isLoading) {
        console.warn(`SoundCloudPlayer: the attempt to load ${url} is being deferred until the player has loaded`)
        this.loadOnReady = url
        return
      }
      this.isLoading = true
      this.startOnPlay = true
      this.onDurationCalled = false
      if (!tracks) {
        this.player.load(url, this.isReady)
      } else {
        this.player.getTracks(url, this.isReady)
      }
    }
    if (!prevProps.playing && playing && !this.isPlaying) {
      this.player.play()
    }
    if (prevProps.playing && !playing && this.isPlaying) {
      this.player.pause()
    }
    if (prevProps.volume !== volume && volume !== null) {
      this.player.setVolume(volume)
    }
    if (prevProps.muted !== muted) {
      if (muted) {
        this.player.mute()
      } else {
        this.player.unmute()
        if (volume !== null) {
          // Set volume next tick to fix a bug with DailyMotion
          setTimeout(() => this.player.setVolume(volume))
        }
      }
    }
  }

  shouldComponentUpdate (nextProps, nextState) {
    return !isEqual(this.props, nextProps) || !isEqual(this.state, nextState)
  }

  getDuration () {
    if (!this.player || !this.isReady) return null
    return this.player.getDuration()
  }

  getCurrentTime () {
    if (!this.isReady) return null
    return this.player.getCurrentTime()
  }

  getSecondsLoaded () {
    if (!this.isReady) return null
    return this.player.getSecondsLoaded()
  }

  getInternalPlayer = () => {
    if (!this.player) return null
    return this.player
  }

  playNext () {
    if (!this.isReady) return null
    return this.player.playNext()
  }

  playPrevious () {
    if (!this.isReady) return null
    return this.player.playPrevious()
  }

  progress = () => {
    if (this.props.url && this.player && this.isReady) {
      const playedSeconds = this.getCurrentTime() || 0
      const loadedSeconds = this.getSecondsLoaded()
      const duration = this.getDuration()
      if (duration) {
        const progress = {
          playedSeconds,
          played: playedSeconds / duration
        }
        if (loadedSeconds !== null) {
          progress.loadedSeconds = loadedSeconds
          progress.loaded = loadedSeconds / duration
        }
        // Only call onProgress if values have changed
        if (progress.playedSeconds !== this.prevPlayed || progress.loadedSeconds !== this.prevLoaded) {
          this.props.onProgress(progress)
        }
        this.prevPlayed = progress.playedSeconds
        this.prevLoaded = progress.loadedSeconds
      }
    }
    this.progressTimeout = setTimeout(this.progress, this.props.progressFrequency || this.props.progressInterval)
  }

  seekTo (amount, type) {
    // When seeking before player is ready, store value and seek later
    if (!this.isReady && amount !== 0) {
      this.seekOnPlay = amount
      setTimeout(() => { this.seekOnPlay = null }, SEEK_ON_PLAY_EXPIRY)
      return
    }
    const isFraction = !type ? (amount > 0 && amount < 1) : type === 'fraction'
    if (isFraction) {
      // Convert fraction to seconds based on duration
      const duration = this.player.getDuration()
      if (!duration) {
        console.warn('SoundCloudPlayer: could not seek using fraction – duration not yet available')
        return
      }
      this.player.seekTo(duration * amount)
      return
    }
    this.player.seekTo(amount)
  }

  getCurrentSound = () => {
    if (!this.isReady) return null
    return this.player.getCurrentSound()
  }

  handlePlayerMount = player => {
    this.player = player
    const { url, tracks } = this.props
    if (!tracks) {
      this.player.load(url, this.isReady)
      this.progress()
    } else {
      this.player.getTracks(url, this.isReady)
    }
  }

  handleReady = () => {
    if (!this.mounted) return
    this.isReady = true
    this.isLoading = false
    const { onReady, playing, volume, muted } = this.props
    onReady(this)
    if (!muted && volume !== null) {
      this.player.setVolume(volume)
    }
    if (this.loadOnReady) {
      this.player.load(this.loadOnReady, true)
      this.loadOnReady = null
    } else if (playing) {
      this.player.play()
    }
    this.handleDurationCheck()
  }

  handleTracks = (tracks) => {
    if (!this.mounted) return
    this.isReady = true
    this.isLoading = false
    this.props.onTracks(tracks)
    if (this.loadOnReady) {
      this.player.getTracks(this.loadOnReady, true)
      this.loadOnReady = null
    }
  }

  handlePlay = () => {
    this.isPlaying = true
    this.isLoading = false
    const { onStart, onPlay } = this.props
    if (this.startOnPlay) {
      onStart()
      this.startOnPlay = false
    }
    onPlay()
    if (this.seekOnPlay) {
      this.seekTo(this.seekOnPlay)
      this.seekOnPlay = null
    }
    this.handleDurationCheck()
  }

  handlePause = (e) => {
    this.isPlaying = false
    if (!this.isLoading) {
      this.props.onPause(e)
    }
  }

  handleEnded = () => {
    const { onEnded } = this.props
    this.isPlaying = false
    onEnded()
  }

  handleError = (...args) => {
    this.isLoading = false
    this.props.onError(...args)
  }

  handleDurationCheck = () => {
    clearTimeout(this.durationCheckTimeout)
    const duration = this.getDuration()
    if (duration) {
      if (!this.onDurationCalled) {
        this.props.onDuration(duration)
        this.onDurationCalled = true
      }
    } else {
      this.durationCheckTimeout = setTimeout(this.handleDurationCheck, 100)
    }
  }

  handleLoaded = () => {
    // Sometimes we know loading has stopped but onReady/onPlay are never called
    // so this provides a way for players to avoid getting stuck
    this.isLoading = false
  }

  render () {
    const { url } = this.props
    return (
      <div ref={this.references.wrapper}>
        <SoundCloud
          {...this.props}
          url={url}
          ref={this.references.player}
          onMount={this.handlePlayerMount}
          onReady={this.handleReady}
          onTracks={this.handleTracks}
          onPlay={this.handlePlay}
          onPause={this.handlePause}
          onEnded={this.handleEnded}
          onLoaded={this.handleLoaded}
          onError={this.handleError}
        />
      </div>
    )
  }
}
