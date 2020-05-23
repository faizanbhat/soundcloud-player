import PropTypes from 'prop-types'

const { string, bool, number, func } = PropTypes

export const propTypes = {
  url: string,
  tracks: bool,
  playing: bool,
  volume: number,
  muted: bool,
  progressInterval: number,
  onReady: func,
  onStart: func,
  onPlay: func,
  onPause: func,
  onEnded: func,
  onError: func,
  onDuration: func,
  onSeek: func,
  onProgress: func
}

export const defaultProps = {
  playing: false,
  volume: null,
  muted: false,
  progressInterval: 1000,
  onTracks: function () {},
  onReady: function () {},
  onStart: function () {},
  onPlay: function () {},
  onPause: function () {},
  onEnded: function () {},
  onError: function () {},
  onDuration: function () {},
  onSeek: function () {},
  onProgress: function () {}
}
