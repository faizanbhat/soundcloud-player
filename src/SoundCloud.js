import React, { Component } from 'react'

import { callPlayer, getSDK } from './utils'

const SDK_URL = 'https://w.soundcloud.com/player/api.js'
const SDK_GLOBAL = 'SC'

export default class SoundCloud extends Component {
  static displayName = 'SoundCloud'
  callPlayer = callPlayer
  duration = null
  currentTime = 0
  fractionLoaded = null
  currentSound = null

  componentDidMount () {
    this.props.onMount && this.props.onMount(this)
  }

  load (url, isReady) {
    getSDK(SDK_URL, SDK_GLOBAL).then(SC => {
      if (!this.iframe) return
      const { PLAY, PLAY_PROGRESS, PAUSE, FINISH, ERROR } = SC.Widget.Events
      if (!isReady) {
        this.player = SC.Widget(this.iframe)
        this.player.bind(PLAY, this.props.onPlay)
        this.player.bind(PAUSE, this.props.onPause)
        this.player.bind(PLAY_PROGRESS, e => {
          this.currentTime = e.currentPosition / 1000
          this.fractionLoaded = e.loadedProgress
        })
        this.player.bind(FINISH, () => this.handleEnded())
        this.player.bind(ERROR, e => this.props.onError(e))
      }
      this.player.load(url, {
        callback: () => {
          this.player.getDuration(duration => {
            this.duration = duration / 1000
            this.player.getCurrentSound(sound => {
              this.currentSound = sound
              this.props.onReady()
            })
          })
        }
      })
    })
  }

  getTracks (url, isReady) {
    getSDK(SDK_URL, SDK_GLOBAL).then(SC => {
      if (!this.iframe) return
      const { ERROR } = SC.Widget.Events
      if (!isReady) {
        this.player = SC.Widget(this.iframe)
        this.player.bind(ERROR, e => this.props.onError(e))
      }
      this.player.load(url, {
        callback: () => {
          this.player.getSounds(sounds => {
            this.props.onTracks(sounds)
          })
        }
      })
    })
  }

  handleEnded () {
    this.props.onEnded()
  }

  getCurrentSound () {
    return this.currentSound
  }

  play () {
    this.callPlayer('play')
  }

  pause () {
    this.callPlayer('pause')
  }

  seekTo (seconds) {
    this.callPlayer('seekTo', seconds * 1000)
  }

  setVolume (fraction) {
    this.callPlayer('setVolume', fraction * 100)
  }

  mute = () => {
    this.setVolume(0)
  }

  unmute = () => {
    if (this.props.volume !== null) {
      this.setVolume(this.props.volume)
    }
  }

  getDuration () {
    return this.duration
  }

  getCurrentTime () {
    return this.currentTime
  }

  getSecondsLoaded () {
    return this.fractionLoaded * this.duration
  }

  ref = iframe => {
    this.iframe = iframe
  }

  render () {
    const style = {
      width: '100%',
      height: '100%',
      display: 'none'
    }
    return (
      <iframe
        ref={this.ref}
        src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(this.props.url)}`}
        style={style}
        frameBorder={0}
        allow='autoplay'
      />
    )
  }
}
