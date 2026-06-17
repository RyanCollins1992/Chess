import { useState, useRef, useMemo } from 'react'
import { Chessboard } from '../components/ui/Chessboard'
import { Chess } from 'chess.js'
import { progressManager } from '../core/ProgressManager'
import { useAppStore } from '../store/useAppStore'

const PUZZLES = [
  { id: 'p1', title: 'Back Rank Checkmate', theme: 'Checkmate', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', solution: ['Rd8'], hint: 'The enemy king is trapped on the back rank', difficulty: 'beginner' },
  { id: 'p2', title: 'Win the Queen', theme: 'Tactics', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 4', solution: ['g6'], hint: 'Drive the queen away with a pawn', difficulty: 'beginner' },
  { id: 'p3', title: 'Pin and Win', theme: 'Pin', fen: 'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6', solution: ['Bxf7+'], hint: 'The f7 square is a classic weakness', difficulty: 'intermediate' },
  { id: 'p4', title: 'Discovered Attack', theme: 'Discovery', fen: '4r1k1/pp3ppp/2p5/8/3B4/1P6/P4PPP/R5K1 w - - 0 1', solution: ['Bf6'], hint: 'Move the bishop to reveal a hidden attack', difficulty: 'intermediate' },
  { id: 'p5', title: 'Fork the King and Rook', theme: 'Fork', fen: 'r3k3/8/8/8/8/8/8/4KN2 w - - 0 1', solution: ['Nd2'], hint: 'Knight forks are powerful', difficulty: 'beginner' },
  { id: 'p6', title: 'Queen Sacrifice', theme: 'Sacrifice', fen: '5rk1/pb3p1p/1p4p1/3q4/2P5/5N2/PP3PPP/R2QR1K1 w - - 0 1', solution: ['Qxd5'], hint: 'Sometimes giving up the queen wins more back', difficulty: 'advanced' },
  { id: 'p7', title: 'King Opposition', theme: 'Endgame', fen: '8/8/4k3/8/4K3/8/8/8 w - - 0 1', solution: ['Kf4'], hint: 'Gain the opposition to control the board', difficulty: 'beginner' },
  { id: 'p8', title: 'Smothered Mate Setup', theme: 'Checkmate', fen: '5rk1/5ppp/8/8/8/8/5PPP/4RNK1 w - - 0 1', solution: ['Ne3'], hint: 'The knight needs to reach h6', difficulty: 'intermediate' },
  { id: 'p9', title: 'Back Rank Finish', theme: 'Checkmate', fen: 'r1k2qnr/pppb1pp1/2n5/2Npp2p/2PP4/1P2PKN1/P4PPP/R1BQ1B1R b - - 6 13', solution: ['Bg4#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'intermediate' },
  { id: 'p10', title: 'Mating Net', theme: 'Checkmate', fen: '5bnr/np3kp1/p2p4/q1p1pp1p/PPb2P2/2KP2P1/2PBP1BP/R1Q3NR b - - 2 15', solution: ['Qxb4#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'advanced' },
  { id: 'p11', title: 'Deliver Mate', theme: 'Checkmate', fen: 'r2k1bn1/1b1p2p1/5p1r/pp1P2qp/N2np1Q1/1p2P1PB/PBPN1P1P/R3K2R w - - 0 18', solution: ['Qxd7#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'beginner' },
  { id: 'p12', title: 'Final Blow', theme: 'Checkmate', fen: '1r3knr/nbqp1p1p/p2b3N/1pp5/1B1pP1p1/1P3QPN/P1P2P1P/R2K1B1R w - - 0 20', solution: ['Qxf7#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'intermediate' },
  { id: 'p13', title: 'Checkmate Pattern', theme: 'Checkmate', fen: '1nbqkbnr/prppp3/1p5p/1N3pp1/1P2P1Q1/P2P1P1N/2P3PP/R1B1KB1R w KQk - 0 10', solution: ['Qh5#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'advanced' },
  { id: 'p14', title: 'Back Rank Finish 2', theme: 'Checkmate', fen: '1k6/ppp5/8/8/8/8/8/K2R4 w - - 0 1', solution: ['Rd8#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'beginner' },
  { id: 'p15', title: 'Mating Net 2', theme: 'Checkmate', fen: '1k6/ppp5/8/8/8/8/8/K3R3 w - - 0 1', solution: ['Re8#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'intermediate' },
  { id: 'p16', title: 'Deliver Mate 2', theme: 'Checkmate', fen: '1k6/ppp5/8/8/8/8/8/K4R2 w - - 0 1', solution: ['Rf8#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'advanced' },
  { id: 'p17', title: 'Final Blow 2', theme: 'Checkmate', fen: '1k6/ppp5/8/8/8/8/8/K5R1 w - - 0 1', solution: ['Rg8#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'beginner' },
  { id: 'p18', title: 'Checkmate Pattern 2', theme: 'Checkmate', fen: '1k6/ppp5/8/8/8/8/8/K6R w - - 0 1', solution: ['Rh8#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'intermediate' },
  { id: 'p19', title: 'Back Rank Finish 3', theme: 'Checkmate', fen: '2k5/1ppp4/8/8/8/8/8/R6K w - - 0 1', solution: ['Ra8#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'advanced' },
  { id: 'p20', title: 'Mating Net 3', theme: 'Checkmate', fen: '2k5/1ppp4/8/8/8/8/8/K3R3 w - - 0 1', solution: ['Re8#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'beginner' },
  { id: 'p21', title: 'Deliver Mate 3', theme: 'Checkmate', fen: '2k5/1ppp4/8/8/8/8/8/K4R2 w - - 0 1', solution: ['Rf8#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'intermediate' },
  { id: 'p22', title: 'Final Blow 3', theme: 'Checkmate', fen: '2k5/1ppp4/8/8/8/8/8/K5R1 w - - 0 1', solution: ['Rg8#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'advanced' },
  { id: 'p23', title: 'Checkmate Pattern 3', theme: 'Checkmate', fen: '2k5/1ppp4/8/8/8/8/8/K6R w - - 0 1', solution: ['Rh8#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'beginner' },
  { id: 'p24', title: 'Back Rank Finish 4', theme: 'Checkmate', fen: '3k4/2ppp3/8/8/8/8/8/R6K w - - 0 1', solution: ['Ra8#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'intermediate' },
  { id: 'p25', title: 'Mating Net 4', theme: 'Checkmate', fen: '3k4/2ppp3/8/8/8/8/8/KR6 w - - 0 1', solution: ['Rb8#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'advanced' },
  { id: 'p26', title: 'Deliver Mate 4', theme: 'Checkmate', fen: '3k4/2ppp3/8/8/8/8/8/K4R2 w - - 0 1', solution: ['Rf8#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'beginner' },
  { id: 'p27', title: 'Final Blow 4', theme: 'Checkmate', fen: '3k4/2ppp3/8/8/8/8/8/K5R1 w - - 0 1', solution: ['Rg8#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'intermediate' },
  { id: 'p28', title: 'Checkmate Pattern 4', theme: 'Checkmate', fen: '3k4/2ppp3/8/8/8/8/8/K6R w - - 0 1', solution: ['Rh8#'], hint: 'Look for a forcing move that leaves the king with no escape.', difficulty: 'advanced' },
  { id: 'p29', title: 'Win Material', theme: 'Tactics', fen: 'r1b1kb1r/p3p2p/1p1p1p1R/P4nP1/1P6/R1q2P2/3KP1P1/1NBQnBN1 w kq - 0 16', solution: ['Nxc3'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'beginner' },
  { id: 'p30', title: 'Spot the Tactic', theme: 'Tactics', fen: 'rn2kb2/1p1bn2r/2p1pp1p/p2pBqp1/P2P2PP/2R1P2B/1PPQ1P1R/1NK3N1 b q - 3 18', solution: ['fxe5'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'intermediate' },
  { id: 'p31', title: 'Tactical Shot', theme: 'Tactics', fen: 'r3kb1r/pp2pppp/nqpp1nN1/1b6/7P/P3P3/1PP2PB1/RNBQK1R1 w Qkq - 1 12', solution: ['Nxh8'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'beginner' },
  { id: 'p32', title: 'Punish the Blunder', theme: 'Tactics', fen: 'rnbqkb1r/p1p1p1pp/3p2Pn/8/P4p2/1p1P3B/1PPNPP1P/R1BQK1NR w KQkq - 0 8', solution: ['Bxc8'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'intermediate' },
  { id: 'p33', title: 'Snap It Up', theme: 'Tactics', fen: '1r2kb1r/ppp1p2p/n2qb3/1P1p1p2/3B2n1/2P1Pp1P/P2P1NPR/1R1QKBN1 w - - 2 15', solution: ['hxg4'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'beginner' },
  { id: 'p34', title: 'Win Material 2', theme: 'Tactics', fen: 'r1bk4/p1ppNq1p/np4r1/2b1p1p1/2BP1pn1/1PQ1PKP1/P1P2P1P/RNBR4 w - - 4 19', solution: ['Nxc8'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'intermediate' },
  { id: 'p35', title: 'Spot the Tactic 2', theme: 'Tactics', fen: '2bqk1nr/r1pp1Qp1/1pn2p1p/4pP2/PB1b3P/6P1/1RP1P3/1N2KBNR b Kk - 2 15', solution: ['Kxf7'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'beginner' },
  { id: 'p36', title: 'Tactical Shot 2', theme: 'Tactics', fen: '1rb1k2r/2ppnp1p/n7/pp1NPqp1/PbP3P1/4PN1P/RPQP2BR/2B1K3 b - - 1 16', solution: ['Qxc2'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'intermediate' },
  { id: 'p37', title: 'Punish the Blunder 2', theme: 'Tactics', fen: '3q1b2/1p2n1pr/r1np1pk1/p1p1pb1p/5PPP/PQP4R/RP1PPK2/1NB2BN1 b - - 3 16', solution: ['Bxb1'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'beginner' },
  { id: 'p38', title: 'Snap It Up 2', theme: 'Tactics', fen: '2bqkb2/3pppQ1/pr6/np3r2/2PP1P2/PP5p/4P1Bn/RNB3KR b - - 0 18', solution: ['hxg2'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'intermediate' },
  { id: 'p39', title: 'Win Material 3', theme: 'Tactics', fen: 'rnb1k1nr/p1pp1p2/3bp1p1/1p4qp/1P4P1/N1PP1N1P/P3PP2/R1BQKB1R w KQkq - 0 8', solution: ['Nxg5'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'beginner' },
  { id: 'p40', title: 'Spot the Tactic 3', theme: 'Tactics', fen: '1nbq1knr/1p1p2pp/r7/p1pQpp2/1b6/2PPP2P/PP1NNPP1/R1B1KB1R w KQ - 0 9', solution: ['cxb4'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'intermediate' },
  { id: 'p41', title: 'Tactical Shot 3', theme: 'Tactics', fen: 'r1b2bnr/p1qppkpp/1pn2p2/2pP4/5BP1/5P1P/PPP1P3/RN1QKBNR w KQ - 0 8', solution: ['Bxc7'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'beginner' },
  { id: 'p42', title: 'Punish the Blunder 3', theme: 'Tactics', fen: 'r2k2nr/p1pn1p1p/1p6/3Q1P2/1bPP2pq/6P1/PB1NP2P/RN2KB1R b KQ - 0 16', solution: ['Bxd2+'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'intermediate' },
  { id: 'p43', title: 'Snap It Up 3', theme: 'Tactics', fen: 'r2qkbr1/pbp2ppp/np2p3/1N1pn3/3P1P2/P2QP1PN/1PP4P/R1B1KB1R b KQq - 2 10', solution: ['Nxd3+'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'beginner' },
  { id: 'p44', title: 'Win Material 4', theme: 'Tactics', fen: 'r2qkbnr/p1p1p1pp/bp1p1p2/1Q6/P2PP1P1/1P6/R1P1BP1P/1N2K1NR b Kkq - 3 10', solution: ['Bxb5'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'intermediate' },
  { id: 'p45', title: 'Spot the Tactic 4', theme: 'Tactics', fen: 'rnbqk1n1/pppp2p1/4p2r/1P2p2p/4P2P/7N/P1PPKbP1/RN1Q1B1R w q - 0 9', solution: ['Kxf2'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'beginner' },
  { id: 'p46', title: 'Tactical Shot 4', theme: 'Tactics', fen: 'r1bqk1r1/p2p2pp/n1p1pp1n/1P4B1/3b1PPP/1R6/P3P3/RN1K1BN1 b - - 2 17', solution: ['Bxg1'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'intermediate' },
  { id: 'p47', title: 'Punish the Blunder 4', theme: 'Tactics', fen: '1nbq1b1r/3rp1pp/2p1kB1n/pp1p4/3P4/5PPN/PPP1PK1P/RN1Q1B1R b - - 2 13', solution: ['exf6'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'beginner' },
  { id: 'p48', title: 'Snap It Up 4', theme: 'Tactics', fen: '1nb4r/rp2bpp1/2pp1k1p/P3p2q/2PB1Nn1/P2P1P2/1Q1KP1P1/RN3B1R b - - 5 18', solution: ['exd4'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'intermediate' },
  { id: 'p49', title: 'Win Material 5', theme: 'Tactics', fen: '1nbq2nr/1p2k1p1/r7/p1Ppp2p/6B1/2N1PPb1/PPPB2PP/1R1Q1KNR w - - 0 14', solution: ['Bxc8'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'beginner' },
  { id: 'p50', title: 'Spot the Tactic 5', theme: 'Tactics', fen: 'r1b1k1nr/p3pp1p/3p3b/q1n3p1/1ppP2PP/5P2/P2KP3/RNBQ1BNR w kq - 0 12', solution: ['dxc5'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'intermediate' },
  { id: 'p51', title: 'Tactical Shot 5', theme: 'Tactics', fen: 'r1b1kb1r/2pq2pp/p6n/1p1ppp2/P4P1P/NP1P2P1/3PP3/R1BQKBNR b KQkq - 0 13', solution: ['Bxa3'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'beginner' },
  { id: 'p52', title: 'Punish the Blunder 5', theme: 'Tactics', fen: '2rk2nr/pb1p1pp1/1p1b3q/1B2p2p/1P2PQ1P/PnpP2NR/1BPR1PP1/2K3N1 w - - 11 18', solution: ['cxb3'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'intermediate' },
  { id: 'p53', title: 'Snap It Up 5', theme: 'Tactics', fen: 'rqk2bnr/1bp3p1/B3p2p/1p1pPp2/N2n1P2/PP5P/R1PPQ1P1/2BK2NR b - - 4 13', solution: ['Nxe2'], hint: 'A piece is hanging or undefended — find the move that wins it.', difficulty: 'beginner' },
  { id: 'p54', title: 'Double Attack', theme: 'Fork', fen: 'rnb1kbnr/3p4/1q4p1/pp1Npp1p/1P1pPP1P/P1BB4/2P3P1/1R1QK1NR w Kq - 0 18', solution: ['Ne7'], hint: 'One move can attack two pieces at the same time.', difficulty: 'intermediate' },
  { id: 'p55', title: 'Knight Fork', theme: 'Fork', fen: 'rn2k2r/pb2n2p/3ppB2/2pN1pp1/qp1N1P2/1P6/2PPP1PP/RQ2KB1R w kq - 0 19', solution: ['Nc6'], hint: 'One move can attack two pieces at the same time.', difficulty: 'advanced' },
  { id: 'p56', title: 'Fork and Win', theme: 'Fork', fen: 'rn1qk1r1/pp2ppb1/6p1/PPpp4/6n1/B1P1P1Pb/3P1P1P/RN1QK1NR b KQq - 1 11', solution: ['Nxf2'], hint: 'One move can attack two pieces at the same time.', difficulty: 'intermediate' },
  { id: 'p57', title: 'Two Birds One Move', theme: 'Fork', fen: '1rb2bnr/2kn1p2/P1p1p1p1/3pP2p/RpPq3P/1P1B1P2/1B1PQ1PN/1N2K2R b K - 0 20', solution: ['Nc5'], hint: 'One move can attack two pieces at the same time.', difficulty: 'advanced' },
  { id: 'p58', title: 'Double Attack 2', theme: 'Fork', fen: 'r1b2b1r/ppq3kp/3pp2n/nBpP2p1/1PPNPpP1/2N5/P4P1P/R1BQ1K1R b - - 1 13', solution: ['Nb3'], hint: 'One move can attack two pieces at the same time.', difficulty: 'intermediate' },
  { id: 'p59', title: 'Knight Fork 2', theme: 'Fork', fen: 'rn2k2r/1ppb1p2/1N1bpqp1/p6p/1PP1n2N/6P1/4RPRP/2B1KB2 w kq - 2 17', solution: ['Nxd7'], hint: 'One move can attack two pieces at the same time.', difficulty: 'advanced' },
  { id: 'p60', title: 'Fork and Win 2', theme: 'Fork', fen: 'rnb1k1nr/1pp2p2/3pp3/p1b3pp/N1P2PP1/PP5P/2QPP1B1/R1B1K1Nq w Qkq - 0 12', solution: ['Nb6'], hint: 'One move can attack two pieces at the same time.', difficulty: 'intermediate' },
  { id: 'p61', title: 'Two Birds One Move 2', theme: 'Fork', fen: '2r1kb1r/pbppnNpp/4q2B/n7/1PpP4/P3P3/5PPP/RNQ1KB1R b KQk - 2 12', solution: ['Nb3'], hint: 'One move can attack two pieces at the same time.', difficulty: 'advanced' },
  { id: 'p62', title: 'Double Attack 3', theme: 'Fork', fen: 'rnbk1b2/4pp1r/7p/ppP1P1p1/NP4q1/B4n1P/P1P1K1B1/R5NR w - - 1 19', solution: ['Nb6'], hint: 'One move can attack two pieces at the same time.', difficulty: 'intermediate' },
  { id: 'p63', title: 'Knight Fork 3', theme: 'Fork', fen: 'rnbq1kr1/1ppp2pp/4p3/p1N2p2/1b2nP1P/4N3/2PPP1P1/1RBQKB1R w K - 4 14', solution: ['Na6'], hint: 'One move can attack two pieces at the same time.', difficulty: 'advanced' },
  { id: 'p64', title: 'Fork and Win 3', theme: 'Fork', fen: 'r1bqk1nr/2p1p2p/1p3ppb/3p1P2/nP2P2P/B4K2/P1PPB1P1/RN1Q2NR b k - 1 12', solution: ['Nc3'], hint: 'One move can attack two pieces at the same time.', difficulty: 'intermediate' },
  { id: 'p65', title: 'Two Birds One Move 3', theme: 'Fork', fen: '2b1k2r/r2pbp1p/pp2pn2/PPp3R1/RP6/B1NP3P/3NPP2/2K2B2 b k - 0 18', solution: ['Ne4'], hint: 'One move can attack two pieces at the same time.', difficulty: 'advanced' },
  { id: 'p66', title: 'Double Attack 4', theme: 'Fork', fen: 'r1q1kb1r/p1p1pppp/Qpn5/3pBn2/1PP2Pb1/N2P2P1/P3P3/R3KBNR b KQkq - 4 13', solution: ['Nxg3'], hint: 'One move can attack two pieces at the same time.', difficulty: 'intermediate' },
  { id: 'p67', title: 'Knight Fork 4', theme: 'Fork', fen: 'r1bqkbnr/pp2ppp1/2p4p/3p1P2/PP4P1/1n6/1BPPP2P/RN1QKBNR b KQkq - 6 9', solution: ['Nxd2'], hint: 'One move can attack two pieces at the same time.', difficulty: 'advanced' },
  { id: 'p68', title: 'Fork and Win 4', theme: 'Fork', fen: 'r1bqk1n1/pppp1p1r/2n1p1pb/1N4Pp/3P4/7N/PPP1PP1P/R1BQKB1R w KQq - 3 7', solution: ['Nxa7'], hint: 'One move can attack two pieces at the same time.', difficulty: 'intermediate' },
  { id: 'p69', title: 'Discovered Check', theme: 'Discovery', fen: '7k/8/8/8/8/8/1N6/B6K w - - 0 1', solution: ['Na4+'], hint: 'Moving one piece out of the way unleashes an attack from another.', difficulty: 'advanced' },
  { id: 'p70', title: 'Unmask the Attack', theme: 'Discovery', fen: '7k/8/8/8/8/2N5/8/B6K w - - 0 1', solution: ['Na4+'], hint: 'Moving one piece out of the way unleashes an attack from another.', difficulty: 'intermediate' },
  { id: 'p71', title: 'Hidden Threat', theme: 'Discovery', fen: '7k/8/8/8/3N4/8/8/B6K w - - 0 1', solution: ['Nb5+'], hint: 'Moving one piece out of the way unleashes an attack from another.', difficulty: 'advanced' },
  { id: 'p72', title: 'Reveal the Bishop', theme: 'Discovery', fen: '7k/8/8/4N3/8/8/8/B6K w - - 0 1', solution: ['Nc6+'], hint: 'Moving one piece out of the way unleashes an attack from another.', difficulty: 'intermediate' },
  { id: 'p73', title: 'Discovered Check 2', theme: 'Discovery', fen: '7k/8/5N2/8/8/8/8/B6K w - - 0 1', solution: ['Nd7+'], hint: 'Moving one piece out of the way unleashes an attack from another.', difficulty: 'advanced' },
  { id: 'p74', title: 'Unmask the Attack 2', theme: 'Discovery', fen: '7k/6N1/8/8/8/8/8/B6K w - - 0 1', solution: ['Ne8+'], hint: 'Moving one piece out of the way unleashes an attack from another.', difficulty: 'intermediate' },
  { id: 'p75', title: 'Hidden Threat 2', theme: 'Discovery', fen: '4k3/8/8/8/8/8/4N3/K3R3 w - - 0 1', solution: ['Nc3+'], hint: 'Moving one piece out of the way unleashes an attack from another.', difficulty: 'advanced' },
  { id: 'p76', title: 'Reveal the Bishop 2', theme: 'Discovery', fen: '4k3/8/8/8/8/4N3/8/K3R3 w - - 0 1', solution: ['Nc4+'], hint: 'Moving one piece out of the way unleashes an attack from another.', difficulty: 'intermediate' },
  { id: 'p77', title: 'Discovered Check 3', theme: 'Discovery', fen: '4k3/8/8/8/4N3/8/8/K3R3 w - - 0 1', solution: ['Nc5+'], hint: 'Moving one piece out of the way unleashes an attack from another.', difficulty: 'advanced' },
  { id: 'p78', title: 'Unmask the Attack 3', theme: 'Discovery', fen: '4k3/8/8/4N3/8/8/8/K3R3 w - - 0 1', solution: ['Nc6+'], hint: 'Moving one piece out of the way unleashes an attack from another.', difficulty: 'intermediate' },
  { id: 'p79', title: 'Exploit the Pin', theme: 'Pin', fen: '4k3/8/8/8/Q3n3/8/8/1K2R3 w - - 0 1', solution: ['Qxe4+'], hint: 'An enemy piece cannot move without exposing its king — attack it.', difficulty: 'intermediate' },
  { id: 'p80', title: 'Pinned and Lost', theme: 'Pin', fen: '4k3/8/8/8/1Q2n3/8/8/K3R3 w - - 0 1', solution: ['Qxe4+'], hint: 'An enemy piece cannot move without exposing its king — attack it.', difficulty: 'advanced' },
  { id: 'p81', title: 'Pin and Win', theme: 'Pin', fen: '4k3/8/8/8/2Q1n3/8/8/K3R3 w - - 0 1', solution: ['Qxe4+'], hint: 'An enemy piece cannot move without exposing its king — attack it.', difficulty: 'intermediate' },
  { id: 'p82', title: 'No Escape', theme: 'Pin', fen: '4k3/8/8/8/4n1Q1/8/8/K3R3 w - - 0 1', solution: ['Qxe4+'], hint: 'An enemy piece cannot move without exposing its king — attack it.', difficulty: 'advanced' },
  { id: 'p83', title: 'Exploit the Pin 2', theme: 'Pin', fen: '4k3/8/8/8/4n2Q/8/8/K3R3 w - - 0 1', solution: ['Qxe4+'], hint: 'An enemy piece cannot move without exposing its king — attack it.', difficulty: 'intermediate' },
  { id: 'p84', title: 'Pinned and Lost 2', theme: 'Pin', fen: '4k3/8/8/Q3n3/8/8/8/1K2R3 w - - 0 1', solution: ['Qxe5+'], hint: 'An enemy piece cannot move without exposing its king — attack it.', difficulty: 'advanced' },
  { id: 'p85', title: 'Pin and Win 2', theme: 'Pin', fen: '4k3/8/8/1Q2n3/8/8/8/K3R3 w - - 0 1', solution: ['Qxe5+'], hint: 'An enemy piece cannot move without exposing its king — attack it.', difficulty: 'intermediate' },
  { id: 'p86', title: 'No Escape 2', theme: 'Pin', fen: '4k3/8/8/2Q1n3/8/8/8/K3R3 w - - 0 1', solution: ['Qxe5+'], hint: 'An enemy piece cannot move without exposing its king — attack it.', difficulty: 'advanced' },
  { id: 'p87', title: 'Exploit the Pin 3', theme: 'Pin', fen: '4k3/8/8/4n1Q1/8/8/8/K3R3 w - - 0 1', solution: ['Qxe5+'], hint: 'An enemy piece cannot move without exposing its king — attack it.', difficulty: 'intermediate' },
  { id: 'p88', title: 'Pinned and Lost 3', theme: 'Pin', fen: '4k3/8/8/4n2Q/8/8/8/K3R3 w - - 0 1', solution: ['Qxe5+'], hint: 'An enemy piece cannot move without exposing its king — attack it.', difficulty: 'advanced' },
  { id: 'p89', title: 'Queen Sacrifice', theme: 'Sacrifice', fen: '3k4/2ppp3/2Q5/8/8/8/8/K7 w - - 0 1', solution: ['Qxc7+'], hint: 'Giving up material can rip open the position around the king.', difficulty: 'advanced' },
  { id: 'p90', title: 'Breaking the Shield', theme: 'Sacrifice', fen: '3k4/2ppp3/3Q4/8/8/8/8/K7 w - - 0 1', solution: ['Qxc7+'], hint: 'Giving up material can rip open the position around the king.', difficulty: 'intermediate' },
  { id: 'p91', title: 'Sacrifice to Expose', theme: 'Sacrifice', fen: '3k4/2ppp3/4Q3/8/8/8/8/K7 w - - 0 1', solution: ['Qxd7+'], hint: 'Giving up material can rip open the position around the king.', difficulty: 'advanced' },
  { id: 'p92', title: 'Give Up Material', theme: 'Sacrifice', fen: '4k3/3ppp2/3Q4/8/8/8/8/K7 w - - 0 1', solution: ['Qxd7+'], hint: 'Giving up material can rip open the position around the king.', difficulty: 'intermediate' },
  { id: 'p93', title: 'Queen Sacrifice 2', theme: 'Sacrifice', fen: '4k3/3ppp2/4Q3/8/8/8/8/K7 w - - 0 1', solution: ['Qxd7+'], hint: 'Giving up material can rip open the position around the king.', difficulty: 'advanced' },
  { id: 'p94', title: 'Breaking the Shield 2', theme: 'Sacrifice', fen: '4k3/3ppp2/5Q2/8/8/8/8/K7 w - - 0 1', solution: ['Qxe7+'], hint: 'Giving up material can rip open the position around the king.', difficulty: 'intermediate' },
  { id: 'p95', title: 'Sacrifice to Expose 2', theme: 'Sacrifice', fen: '5k2/4ppp1/4Q3/8/8/8/8/K7 w - - 0 1', solution: ['Qxe7+'], hint: 'Giving up material can rip open the position around the king.', difficulty: 'advanced' },
  { id: 'p96', title: 'Give Up Material 2', theme: 'Sacrifice', fen: '5k2/4ppp1/5Q2/8/8/8/8/K7 w - - 0 1', solution: ['Qxe7+'], hint: 'Giving up material can rip open the position around the king.', difficulty: 'intermediate' },
  { id: 'p97', title: 'Queen Sacrifice 3', theme: 'Sacrifice', fen: '5k2/4ppp1/6Q1/8/8/8/8/K7 w - - 0 1', solution: ['Qxf7+'], hint: 'Giving up material can rip open the position around the king.', difficulty: 'advanced' },
  { id: 'p98', title: 'Breaking the Shield 3', theme: 'Sacrifice', fen: '6k1/5ppp/5Q2/8/8/8/8/K7 w - - 0 1', solution: ['Qxf7+'], hint: 'Giving up material can rip open the position around the king.', difficulty: 'intermediate' },
  { id: 'p99', title: 'Key Squares', theme: 'Endgame', fen: '8/8/2k5/8/2K5/2P5/8/8 w - - 0 1', solution: ['Kd4'], hint: 'Technique matters more than material here — find the precise move.', difficulty: 'beginner' },
  { id: 'p100', title: 'Opposition', theme: 'Endgame', fen: '8/2k5/8/2K5/2P5/8/8/8 w - - 0 1', solution: ['Kd5'], hint: 'Technique matters more than material here — find the precise move.', difficulty: 'intermediate' },
  { id: 'p101', title: 'Endgame Technique', theme: 'Endgame', fen: '8/8/3k4/8/3K4/3P4/8/8 w - - 0 1', solution: ['Ke4'], hint: 'Technique matters more than material here — find the precise move.', difficulty: 'beginner' },
  { id: 'p102', title: 'King March', theme: 'Endgame', fen: '8/3k4/8/3K4/3P4/8/8/8 w - - 0 1', solution: ['Ke5'], hint: 'Technique matters more than material here — find the precise move.', difficulty: 'intermediate' },
  { id: 'p103', title: 'Key Squares 2', theme: 'Endgame', fen: '8/8/4k3/8/4K3/4P3/8/8 w - - 0 1', solution: ['Kf4'], hint: 'Technique matters more than material here — find the precise move.', difficulty: 'beginner' },
  { id: 'p104', title: 'Opposition 2', theme: 'Endgame', fen: '8/4k3/8/4K3/4P3/8/8/8 w - - 0 1', solution: ['Kf5'], hint: 'Technique matters more than material here — find the precise move.', difficulty: 'intermediate' },
  { id: 'p105', title: 'Endgame Technique 2', theme: 'Endgame', fen: '8/8/5k2/8/5K2/5P2/8/8 w - - 0 1', solution: ['Kg4'], hint: 'Technique matters more than material here — find the precise move.', difficulty: 'beginner' },
  { id: 'p106', title: 'King March 2', theme: 'Endgame', fen: '8/5k2/8/5K2/5P2/8/8/8 w - - 0 1', solution: ['Kg5'], hint: 'Technique matters more than material here — find the precise move.', difficulty: 'intermediate' },
  { id: 'p107', title: 'Key Squares 3', theme: 'Endgame', fen: '8/8/6k1/8/6K1/6P1/8/8 w - - 0 1', solution: ['Kh4'], hint: 'Technique matters more than material here — find the precise move.', difficulty: 'beginner' },
  { id: 'p108', title: 'Opposition 3', theme: 'Endgame', fen: '8/6k1/8/6K1/6P1/8/8/8 w - - 0 1', solution: ['Kh5'], hint: 'Technique matters more than material here — find the precise move.', difficulty: 'intermediate' },
]
const THEMES = ['All', 'Fork', 'Checkmate', 'Tactics', 'Pin', 'Discovery', 'Sacrifice', 'Endgame']
const DIFFICULTIES = ['All', 'beginner', 'intermediate', 'advanced']

export default function PuzzlesPage() {
  const [selectedPuzzle, setSelectedPuzzle] = useState(null)
  const [theme, setTheme]         = useState('All')
  const [difficulty, setDifficulty] = useState('All')
  const [solved, setSolved]       = useState(() => { try { return JSON.parse(localStorage.getItem('elochess-solved-puzzles') || '[]') } catch { return [] } })
  const [streak, setStreak]       = useState(0)
  const showToast     = useAppStore(s => s.showToast)
  const refreshProgress = useAppStore(s => s.refreshProgress)
  const filtered = useMemo(() => PUZZLES.filter(p => (theme === 'All' || p.theme === theme) && (difficulty === 'All' || p.difficulty === difficulty)), [theme, difficulty])

  const pickRandomPuzzle = (excludeIds) => {
    const pool = PUZZLES.filter(p => !excludeIds.includes(p.id))
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const handleSolved = (id) => {
    const next = [...new Set([...solved, id])]
    setSolved(next); localStorage.setItem('elochess-solved-puzzles', JSON.stringify(next))
    const ns = streak + 1; setStreak(ns)
    progressManager.awardXP('PUZZLE_CORRECT')
    if (ns % 5 === 0) progressManager.awardXP('PUZZLE_STREAK_5')
    refreshProgress()
    showToast(ns % 5 === 0 ? `🔥 ${ns} streak! +25 XP` : '✅ Puzzle solved! +15 XP', 'success')

    setTimeout(() => {
      if (next.length >= PUZZLES.length) {
        setSolved([]); localStorage.setItem('elochess-solved-puzzles', '[]')
        showToast('🎉 All puzzles completed! Reshuffling...', 'success')
        setSelectedPuzzle(pickRandomPuzzle([]))
      } else {
        setSelectedPuzzle(pickRandomPuzzle(next))
      }
    }, 1200)
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-64 shrink-0 border-r border-border bg-[#111827] flex flex-col">
        <div className="p-3 border-b border-border space-y-2 shrink-0">
          <select value={theme} onChange={e => setTheme(e.target.value)} className="w-full bg-bg3 border border-border rounded-lg px-2 py-1.5 text-sm text-white outline-none">
            {THEMES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Themes' : t}</option>)}
          </select>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full bg-bg3 border border-border rounded-lg px-2 py-1.5 text-sm text-white outline-none">
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d === 'All' ? 'All Levels' : d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
          <div className="text-xs text-muted">{solved.length}/{PUZZLES.length} solved · Streak: {streak}</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(p => (
            <button key={p.id} onClick={() => setSelectedPuzzle(p)} className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-bg3 transition-colors ${selectedPuzzle?.id === p.id ? 'bg-gold/10 border-l-2 border-gold pl-3' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div><div className={`text-sm font-semibold ${selectedPuzzle?.id === p.id ? 'text-gold' : 'text-white'}`}>{p.title}</div><div className="text-xs text-muted mt-0.5">{p.theme}</div></div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-bold uppercase ${p.difficulty === 'beginner' ? 'text-green-400' : p.difficulty === 'intermediate' ? 'text-yellow-400' : 'text-red-400'}`}>{p.difficulty}</span>
                  {solved.includes(p.id) && <span className="text-accent2 text-xs">✓</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {selectedPuzzle
          ? <PuzzleBoard key={selectedPuzzle.id} puzzle={selectedPuzzle} isSolved={solved.includes(selectedPuzzle.id)} onSolved={() => handleSolved(selectedPuzzle.id)} />
          : <div className="flex items-center justify-center h-full"><div className="text-center"><div className="text-5xl mb-3 opacity-20">🧩</div><div className="font-semibold text-white">Select a puzzle</div></div></div>}
      </div>
    </div>
  )
}

function PuzzleBoard({ puzzle, isSolved, onSolved }) {
  const chessRef = useRef(new Chess(puzzle.fen))
  const [fen, setFen]     = useState(puzzle.fen)
  const [solved, setSolved] = useState(isSolved)
  const [failed, setFailed] = useState(false)
  const [flash, setFlash]   = useState(null)
  const [showHint, setShowHint] = useState(false)
  const showToast = useAppStore(s => s.showToast)

  const handleDrop = ({ sourceSquare: from, targetSquare: to }) => {
    if (solved) return false
    let result
    try { result = chessRef.current.move({ from, to, promotion: 'q' }) } catch { return false }
    if (!result) return false
    const normalize = s => s.replace(/[+#!?]/g, '')
    if (normalize(result.san) === normalize(puzzle.solution[0])) {
      setFen(chessRef.current.fen())
      setFlash('correct'); setSolved(true); onSolved()
      showToast('✅ Solved! +15 XP', 'success')
    } else {
      chessRef.current.undo()
      setFlash('wrong'); setFailed(true)
      showToast('Not the right move — try again!', 'error', 1500)
      setTimeout(() => setFlash(null), 800)
    }
    return true
  }

  const reset = () => {
    chessRef.current = new Chess(puzzle.fen)
    setFen(puzzle.fen); setFlash(null)
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">
          <div className={`rounded-xl overflow-hidden transition-all duration-200 ${flash === 'correct' || solved ? 'ring-2 ring-accent2' : flash === 'wrong' ? 'ring-2 ring-danger' : ''}`}>
            <Chessboard position={fen} onPieceDrop={handleDrop} arePiecesDraggable={!solved}
              customDarkSquareStyle={{ backgroundColor: '#b58863' }} customLightSquareStyle={{ backgroundColor: '#f0d9b5' }} />
          </div>
        </div>
      </div>
      <div className="w-72 shrink-0 border-l border-border bg-[#111827] flex flex-col p-4 gap-4 overflow-y-auto">
        <div><div className="font-bold text-white text-lg">{puzzle.title}</div><div className="text-xs text-muted">{puzzle.theme}</div></div>
        {solved
          ? <div className="bg-accent2/15 border border-accent2/30 rounded-xl p-4 text-center"><div className="text-accent2 font-bold text-lg">✅ Solved!</div>{!failed && <div className="text-xs text-muted mt-1">First try!</div>}</div>
          : <div className="bg-bg3 border border-border rounded-xl p-3 text-sm text-[#9CA3AF]">🎯 Find the best move for {chessRef.current.turn() === 'w' ? 'White' : 'Black'}</div>}
        <div className="space-y-2">
          <button onClick={() => setShowHint(!showHint)} className="w-full btn-ghost text-sm">💡 {showHint ? 'Hide' : 'Show'} Hint</button>
          {showHint && <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 text-sm text-[#9CA3AF]">{puzzle.hint}</div>}
          <button onClick={reset} className="w-full btn-ghost text-sm">↺ Reset</button>
        </div>
      </div>
    </div>
  )
}
