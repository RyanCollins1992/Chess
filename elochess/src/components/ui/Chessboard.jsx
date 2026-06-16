import { Chessboard as RawChessboard } from 'react-chessboard'

export function Chessboard({ options = {}, customBoardStyle, customDarkSquareStyle, customLightSquareStyle, customSquareStyles, arePiecesDraggable, ...props }) {
  return (
    <RawChessboard
      options={{
        ...props,
        ...options,
        boardStyle: customBoardStyle ?? options.boardStyle,
        darkSquareStyle: customDarkSquareStyle ?? options.darkSquareStyle,
        lightSquareStyle: customLightSquareStyle ?? options.lightSquareStyle,
        squareStyles: customSquareStyles ?? options.squareStyles,
        allowDragging: arePiecesDraggable ?? options.allowDragging,
      }}
    />
  )
}
