import { useState, useEffect } from 'react'
import { Chessboard } from '../components/ui/Chessboard'
import { Chess } from 'chess.js'
import { useChessBoard } from '../hooks/useChessBoard'
import { useAppStore } from '../store/useAppStore'

const LEVEL_COLORS = { beginner: 'text-green-400', intermediate: 'text-yellow-400', advanced: 'text-red-400' }

const OPENINGS = [
  {
    id: 'e4', name: '1.e4 Openings', icon: '♙', color: 'white',
    desc: 'The most popular first move — controls the centre and opens lines for the bishop and queen.',
    lines: [
      {
        name: 'Italian Game',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
        idea: 'Control the centre, develop pieces naturally, target the weak f7 square.',
        pros: ['Natural development', 'Lots of tactical opportunities', 'Good for beginners'],
        cons: ['Black has many solid responses', 'Less forcing than other openings'],
        level: 'beginner',
      },
      {
        name: "Bishop's Opening",
        moves: ['e4', 'e5', 'Bc4', 'Nf6', 'Nc3'],
        fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/2N5/PPPP1PPP/R1BQK1NR b KQkq - 3 3',
        idea: 'Aim directly at f7 and keep options open for a wide range of systems.',
        pros: ['Direct pressure on f7', 'Flexible — avoids Petrov', 'Good attacking potential'],
        cons: ['Less central control than 2.Nf3', 'Black can equalise with correct play'],
        level: 'beginner',
      },
      {
        name: 'Four Knights Game',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6'],
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4',
        idea: 'Rapid symmetrical development leading to rich strategic middlegames.',
        pros: ['Rapid development', 'Solid and safe for white', 'Good understanding of classical principles'],
        cons: ['Can lead to drawish symmetry', 'Black equalises comfortably'],
        level: 'beginner',
      },
      {
        name: 'Vienna Game',
        moves: ['e4', 'e5', 'Nc3', 'Nf6', 'f4'],
        fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4PP2/2N5/PPPP2PP/R1BQKBNR b KQkq f3 0 3',
        idea: 'Flexible development supporting a later f4 push or transposition to aggressive systems.',
        pros: ['Flexible — can transpose to many systems', 'Solid centre', 'Less theory than open games'],
        cons: ['Less direct than 2.Nf3', 'Can lead to quiet positions'],
        level: 'beginner',
      },
      {
        name: 'Scotch Game',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'],
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3',
        idea: 'Open the centre immediately, create early complications.',
        pros: ['Good for attacking players', 'Less theory than Ruy López', 'Early central battle'],
        cons: ['Gives black counterplay', 'White gives up pawn centre'],
        level: 'intermediate',
      },
      {
        name: 'Center Game',
        moves: ['e4', 'e5', 'd4', 'exd4', 'Qxd4'],
        fen: 'rnbqkbnr/pppp1ppp/8/8/3QP3/8/PPP2PPP/RNB1KBNR b KQkq - 0 3',
        idea: 'Open the centre immediately and bring the queen out early for active play.',
        pros: ['Quick central action', 'Surprise value', 'Forces black to react immediately'],
        cons: ['Queen is exposed early', 'Objectively gives black easy development'],
        level: 'intermediate',
      },
      {
        name: "King's Gambit",
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3'],
        fen: 'rnbqkbnr/pppp1ppp/8/8/4Pp2/5N2/PPPP2PP/RNBQKB1R b KQkq - 1 3',
        idea: 'Sacrifice a pawn for rapid development and a powerful pawn centre.',
        pros: ['Very sharp and attacking', 'Surprise value', 'Opens the f-file'],
        cons: ['Weakens the king', 'Black can decline or accept and fight back'],
        level: 'intermediate',
      },
      {
        name: 'Ponziani Opening',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'c3'],
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/2P2N2/PP1P1PPP/RNBQKB1R b KQkq - 0 3',
        idea: 'Prepare a d4 thrust while keeping the centre compact and solid.',
        pros: ['Solid centre preparation', 'Avoids heavy theory', 'Good surprise weapon'],
        cons: ['Slow — loses tempo', 'Black can seize the initiative with active play'],
        level: 'intermediate',
      },
      {
        name: 'Danish Gambit',
        moves: ['e4', 'e5', 'd4', 'exd4', 'c3'],
        fen: 'rnbqkbnr/pppp1ppp/8/8/3pP3/2P5/PP3PPP/RNBQKBNR b KQkq - 0 3',
        idea: 'Sacrifice two pawns for a massive lead in development and attack.',
        pros: ['Explosive attacking potential', 'Rapid development', 'Strong initiative'],
        cons: ['Two pawns down if accepted', 'Modern theory shows black can equalise'],
        level: 'intermediate',
      },
      {
        name: 'Ruy López',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
        fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
        idea: "Pin the knight defending e5, creating long-term pressure on black's position.",
        pros: ['Strategically rich', 'Many top-level games', 'Long-lasting pressure'],
        cons: ['Black knows the theory well', 'Can be complex'],
        level: 'advanced',
      },
    ],
  },
  {
    id: 'd4', name: '1.d4 Openings', icon: '♙', color: 'white',
    desc: 'Solid and strategic — builds a strong pawn centre and avoids some sharp early complications.',
    lines: [
      {
        name: 'London System',
        moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'],
        fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/5N2/PPP1PPPP/RN1QKB1R b KQkq - 3 3',
        idea: 'A solid system setup — develop the dark-squared bishop before playing e3.',
        pros: ['Easy to learn', 'Solid structure', 'Works against anything'],
        cons: ['Less dynamic', 'Black can equalise easily'],
        level: 'beginner',
      },
      {
        name: 'Colle System',
        moves: ['d4', 'd5', 'Nf3', 'Nf6', 'e3'],
        fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/3P4/4PN2/PPP2PPP/RNBQKB1R b KQkq - 0 3',
        idea: 'Simple development and a reliable attacking setup against many defences.',
        pros: ['Very easy to learn', 'Automatic attacking plans', 'Solid structure'],
        cons: ['Less ambitious', 'Black can neutralise with accurate play'],
        level: 'beginner',
      },
      {
        name: "Queen's Gambit",
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3'],
        fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3',
        idea: 'Offer a pawn to gain central control — the most classical opening after 1.d4.',
        pros: ['Classical and solid', 'Good endgame positions', 'Strategic depth'],
        cons: ['Can be dry', 'Many defensive systems for black'],
        level: 'intermediate',
      },
      {
        name: 'Torre Attack',
        moves: ['d4', 'Nf6', 'Nf3', 'e6', 'Bg5'],
        fen: 'rnbqkb1r/pppp1ppp/4pn2/6B1/3P4/5N2/PPP1PPPP/RN1QKB1R b KQkq - 1 3',
        idea: 'Pin the knight and build a solid centre with easy piece development.',
        pros: ['Easy to learn', 'Solid and flexible', 'Avoids complex defences'],
        cons: ['Less dynamic', 'Black can equalise with good play'],
        level: 'intermediate',
      },
      {
        name: 'Trompowsky Attack',
        moves: ['d4', 'Nf6', 'Bg5', 'Ne4', 'Bf4'],
        fen: 'rnbqkb1r/pppppppp/8/8/3PnB2/8/PPP1PPPP/RN1QKBNR b KQkq - 4 3',
        idea: 'Sidestep mainstream theory and create early imbalances by attacking the f6 knight.',
        pros: ['Avoids mainstream theory', 'Early imbalances', 'Good surprise value'],
        cons: ['Bishop can be misplaced on g5', 'Black has solid responses'],
        level: 'intermediate',
      },
      {
        name: 'Catalan Opening',
        moves: ['d4', 'Nf6', 'c4', 'e6', 'g3'],
        fen: 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/6P1/PP2PP1P/RNBQKBNR b KQkq - 0 3',
        idea: 'Fianchetto the bishop and combine pressure on the centre with long-term queenside control.',
        pros: ['Rich positional play', 'Long-term bishop on g2', 'Good endgame prospects'],
        cons: ['Requires positional understanding', 'Black has solid defensive setups'],
        level: 'advanced',
      },
    ],
  },
  {
    id: 'flank', name: 'Flank Openings', icon: '♙', color: 'white',
    desc: 'Hypermodern first moves that control the centre from a distance with pieces rather than pawns.',
    lines: [
      {
        name: "Bird's Opening",
        moves: ['f4', 'd5', 'Nf3', 'Nf6', 'e3'],
        fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/5P2/4PN2/PPPP2PP/RNBQKB1R b KQkq - 0 3',
        idea: 'Control e5 immediately and set up a kingside attack from move one.',
        pros: ['Unusual — opponents unprepared', 'Controls e5', 'Leads to unbalanced positions'],
        cons: ['Weakens king safety slightly', 'Objectively less active than 1.e4/1.d4'],
        level: 'beginner',
      },
      {
        name: 'English Opening',
        moves: ['c4', 'e5', 'Nc3', 'Nf6', 'g3'],
        fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2P5/2N3P1/PP1PPP1P/R1BQKBNR b KQkq - 0 3',
        idea: 'Control d5 from a distance and transpose into a wide range of positional systems.',
        pros: ['Extremely flexible', 'Can transpose to many systems', 'Rich positional play'],
        cons: ['Less central control early', 'Requires good positional understanding'],
        level: 'intermediate',
      },
      {
        name: 'Réti Opening',
        moves: ['Nf3', 'd5', 'c4', 'c6', 'b3'],
        fen: 'rnbqkbnr/pp2pppp/2p5/3p4/2P5/1P3N2/P2PPPPP/RNBQKB1R b KQkq - 0 3',
        idea: 'Hypermodern control of the centre with the knight, keeping maximum flexibility.',
        pros: ['Works against anything', 'Surprise weapon', 'Flexible transpositions'],
        cons: ['Less direct central control', 'Can be too passive against aggressive play'],
        level: 'advanced',
      },
    ],
  },
  {
    id: 'black-e4', name: 'Defences vs 1.e4', icon: '♟', color: 'black',
    desc: 'How to respond when white plays 1.e4 — choose a defence that suits your style.',
    lines: [
      {
        name: 'Philidor Defence',
        moves: ['e4', 'e5', 'Nf3', 'd6'],
        fen: 'rnbqkbnr/ppp2ppp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
        idea: 'Maintain a solid pawn on e5 and build a compact, resilient position.',
        pros: ['Very solid and simple', 'Good for positional players', 'Avoids main lines'],
        cons: ['Passive — black gives white space', 'Limited counterplay early on'],
        level: 'beginner',
      },
      {
        name: 'Scandinavian Defence',
        moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3'],
        fen: 'rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 3',
        idea: 'Immediately challenge the e4 pawn and aim for quick piece activity.',
        pros: ['Eliminates e4 pawn immediately', 'Clear plan for black', 'Surprise value'],
        cons: ['Queen is often exposed after recapture', 'White gets easy development'],
        level: 'beginner',
      },
      {
        name: 'French Defence',
        moves: ['e4', 'e6', 'd4', 'd5', 'Nd2'],
        fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPPN1PPP/R1BQKBNR b KQkq - 1 3',
        idea: 'Build a strong pawn chain and counterattack the centre later.',
        pros: ['Very solid', 'Good pawn structure', 'Active counterplay on queenside'],
        cons: ['Light-squared bishop can be passive', 'White can get a kingside attack'],
        level: 'intermediate',
      },
      {
        name: 'Sicilian Defence',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4'],
        fen: 'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3 0 3',
        idea: 'Fight for the centre with a wing pawn — the most popular black response to 1.e4.',
        pros: ['Very dynamic', 'Rich tactical play', 'Black fights for the win'],
        cons: ['Lots of theory', 'White has many Anti-Sicilians'],
        level: 'intermediate',
      },
      {
        name: "Petrov's Defence",
        moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5'],
        fen: 'rnbqkb1r/pppp1ppp/5n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 3',
        idea: 'Counter-attack e4 immediately — symmetrical and solid.',
        pros: ['Very solid', 'Good for draws if needed', 'Leads to Stafford Gambit!'],
        cons: ['Can be passive', 'Limited winning chances if black plays too solidly'],
        level: 'intermediate',
      },
      {
        name: 'Caro-Kann Defence',
        moves: ['e4', 'c6', 'd4', 'd5', 'Nd2'],
        fen: 'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPPN1PPP/R1BQKBNR b KQkq - 1 3',
        idea: 'Solid pawn structure — prepare d5 without blocking the c8 bishop.',
        pros: ['Very solid', 'Good endgames', 'Fewer weaknesses'],
        cons: ['Can be passive', 'White gets good attacking chances in some lines'],
        level: 'intermediate',
      },
      {
        name: "Alekhine's Defence",
        moves: ['e4', 'Nf6', 'e5', 'Nd5', 'd4'],
        fen: 'rnbqkb1r/pppppppp/8/3nP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq d3 0 3',
        idea: "Provoke white's pawns forward and undermine the overextended centre.",
        pros: ['Provokes white to overextend', 'Surprise value', 'Dynamic counterplay'],
        cons: ['Knight is kicked around early', 'White gets space advantage'],
        level: 'advanced',
      },
      {
        name: 'Pirc Defence',
        moves: ['e4', 'd6', 'd4', 'Nf6'],
        fen: 'rnbqkb1r/ppp1pppp/3p1n2/8/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 1 3',
        idea: 'Allow white a big centre and undermine it with dynamic piece play.',
        pros: ['Hypermodern approach', 'Dynamic piece play', 'Rich complications'],
        cons: ['White gets big central space', 'Requires precise defensive technique'],
        level: 'advanced',
      },
      {
        name: 'Modern Defence',
        moves: ['e4', 'g6', 'd4', 'Bg7', 'Nc3'],
        fen: 'rnbqk1nr/ppppppbp/6p1/8/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq - 2 3',
        idea: "Hypermodern approach — let white over-extend then strike at the centre.",
        pros: ['Very flexible — delays commitment', 'Good for creative players', 'Surprise value'],
        cons: ['White can build a dominating centre', 'Requires good positional understanding'],
        level: 'advanced',
      },
      {
        name: 'Nimzowitsch Defence',
        moves: ['e4', 'Nc6', 'd4', 'd5', 'e5'],
        fen: 'r1bqkbnr/ppp1pppp/2n5/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3',
        idea: 'Unconventional knight development to fight for the centre on your own terms.',
        pros: ['Unusual — avoids main theory', 'Fights for e4 immediately', 'Surprise weapon'],
        cons: ['Objectively not the best', 'White can establish a strong centre'],
        level: 'advanced',
      },
      {
        name: "Owen's Defence",
        moves: ['e4', 'b6', 'd4', 'Bb7', 'Bd3'],
        fen: 'rn1qkbnr/pbpppppp/1p6/8/3PP3/3B4/PPP2PPP/RNBQK1NR b KQkq - 2 3',
        idea: "Fianchetto the queen's bishop and build pressure against white's centre.",
        pros: ['Unique — opponents are unprepared', 'Queenside fianchetto pressure', 'Unbalanced play'],
        cons: ['Gives white free rein in the centre', 'Slightly dubious objectively'],
        level: 'advanced',
      },
      {
        name: 'Latvian Gambit',
        moves: ['e4', 'e5', 'Nf3', 'f5'],
        fen: 'rnbqkbnr/pppp2pp/8/4pp2/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
        idea: 'Aggressive counterattack sacrificing structural integrity for early initiative.',
        pros: ['Very sharp — great surprise weapon', 'Black fights for the initiative immediately', 'Lots of traps for white'],
        cons: ['Objectively dubious', 'White can get a large advantage with precise play'],
        level: 'advanced',
      },
    ],
  },
  {
    id: 'black-d4', name: 'Defences vs 1.d4', icon: '♟', color: 'black',
    desc: 'How to respond when white plays 1.d4 — fighting or solid options available.',
    lines: [
      {
        name: "Queen's Gambit Declined",
        moves: ['d4', 'd5', 'c4', 'e6'],
        fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
        idea: 'Keep a solid centre and wait for the right moment to strike back.',
        pros: ['Very solid classical choice', 'Good endgame chances', 'Sound pawn structure'],
        cons: ['Can be passive', 'White gets queenside space'],
        level: 'beginner',
      },
      {
        name: 'Slav Defence',
        moves: ['d4', 'd5', 'c4', 'c6'],
        fen: 'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
        idea: 'Support d5 solidly with c6 while keeping the light-squared bishop active.',
        pros: ['Solid — keeps the light-squared bishop active', 'Good counter-chances', 'Sound structure'],
        cons: ['Can be dry', 'White has many systems to test black'],
        level: 'intermediate',
      },
      {
        name: "Queen's Gambit Accepted",
        moves: ['d4', 'd5', 'c4', 'dxc4'],
        fen: 'rnbqkbnr/ppp1pppp/8/8/2pP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
        idea: 'Accept the pawn and use the extra tempo to achieve rapid piece development.',
        pros: ['Wins a tempo in development', 'Active piece play', 'Avoids some heavy d4 theory'],
        cons: ['Hard to keep the extra pawn', 'White gets strong central control'],
        level: 'intermediate',
      },
      {
        name: 'Budapest Gambit',
        moves: ['d4', 'Nf6', 'c4', 'e5'],
        fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
        idea: 'Surprise gambit — give a pawn for rapid development and activity.',
        pros: ['Great surprise weapon', 'Active piece play', "Out of white's prep"],
        cons: ['Objectively slightly worse', 'White can decline'],
        level: 'intermediate',
      },
      {
        name: 'Dutch Defence',
        moves: ['d4', 'f5', 'g3', 'Nf6', 'Bg2'],
        fen: 'rnbqkb1r/ppppp1pp/5n2/5p2/3P4/6P1/PPP1PPBP/RNBQK1NR b KQkq - 2 3',
        idea: 'Control e4 immediately and build aggressive kingside attacking chances.',
        pros: ['Controls e4 immediately', 'Unbalanced — black fights for a win', 'Good for aggressive players'],
        cons: ['Weakens the kingside', 'White can get attacking chances against the king'],
        level: 'intermediate',
      },
      {
        name: "King's Indian Defence",
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'],
        fen: 'rnbqk2r/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
        idea: 'Fianchetto the bishop and counter-attack in the centre — dynamic and aggressive.',
        pros: ['Very sharp', 'Black fights for the win', 'Complex middlegames'],
        cons: ['White gets central space', 'Lots of theory'],
        level: 'advanced',
      },
      {
        name: 'Nimzo-Indian Defence',
        moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
        fen: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
        idea: 'Actively fight the centre while developing with tempo by pinning the knight.',
        pros: ['Actively fights the centre', 'Creates structural imbalances', 'Rich strategic play'],
        cons: ['Black gives up the bishop pair', 'White can get strong central pawns'],
        level: 'advanced',
      },
      {
        name: 'Grünfeld Defence',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'],
        fen: 'rnbqkb1r/ppp1pp1p/5np1/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 4',
        idea: 'Allow a large white centre then systematically destroy it with piece pressure.',
        pros: ['Very dynamic', 'Black fights for equality immediately', 'Theoretically rich'],
        cons: ['Requires deep theoretical knowledge', 'White can build a huge centre'],
        level: 'advanced',
      },
      {
        name: 'Benoni Defence',
        moves: ['d4', 'Nf6', 'c4', 'c5', 'd5'],
        fen: 'rnbqkb1r/pp1ppppp/5n2/2pP4/2P5/8/PP2PPPP/RNBQKBNR b KQkq - 0 3',
        idea: 'Create an imbalanced pawn structure and fight for dynamic kingside play.',
        pros: ['Very dynamic and aggressive', 'Black fights for the initiative', 'Rich tactical play'],
        cons: ['White gets a strong pawn centre', 'Can be objectively better for white'],
        level: 'advanced',
      },
    ],
  },
]

export default function LearnOpeningsPage() {
  const [selected, setSelected]     = useState(OPENINGS[0])
  const [selectedLine, setSelectedLine] = useState(OPENINGS[0].lines[0])
  const { fen, tryMove, reset } = useChessBoard(selectedLine.fen)

  useEffect(() => {
    reset(selectedLine.fen)
  }, [selectedLine, reset])
  const navigate = useAppStore(s => s.navigate)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left — opening families */}
      <div className="w-52 shrink-0 border-r border-border bg-[#111827] flex flex-col overflow-y-auto">
        <div className="p-3 border-b border-border shrink-0">
          <div className="font-bold text-white text-sm">Opening Theory</div>
          <div className="text-xs text-muted mt-0.5">Tap to explore</div>
        </div>
        {OPENINGS.map(o => (
          <button
            key={o.id}
            onClick={() => { setSelected(o); setSelectedLine(o.lines[0]) }}
            className={`text-left px-4 py-3 border-b border-border/50 hover:bg-bg3 transition-colors ${
              selected.id === o.id ? 'bg-gold/10 border-l-2 border-gold pl-3' : ''
            }`}
          >
            <div className={`text-sm font-semibold ${selected.id === o.id ? 'text-gold' : 'text-white'}`}>{o.name}</div>
            <div className="text-xs text-muted mt-0.5">{o.lines.length} lines</div>
          </button>
        ))}
      </div>

      {/* Middle — lines list */}
      <div className="w-48 shrink-0 border-r border-border bg-[#111827] flex flex-col overflow-y-auto">
        <div className="p-3 border-b border-border shrink-0 text-xs text-muted uppercase tracking-wide font-bold">
          Lines
        </div>
        {selected.lines.map(line => (
          <button
            key={line.name}
            onClick={() => setSelectedLine(line)}
            className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-bg3 transition-colors ${
              selectedLine?.name === line.name ? 'bg-gold/10 border-l-2 border-gold pl-3' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <div className={`text-sm font-semibold truncate ${selectedLine?.name === line.name ? 'text-gold' : 'text-white'}`}>
                {line.name}
              </div>
              <span className={`text-[10px] font-bold uppercase shrink-0 ${LEVEL_COLORS[line.level]}`}>
                {line.level}
              </span>
            </div>
            <div className="text-xs text-muted font-mono mt-0.5">{line.moves.slice(0, 3).join(' ')}…</div>
          </button>
        ))}
      </div>

      {/* Right — detail */}
      {selectedLine && (
        <div className="flex-1 overflow-hidden flex">
          {/* Board */}
          <div className="flex items-center justify-center p-6 flex-1">
            <div className="w-full max-w-[360px]">
              <Chessboard
                position={fen}
                onPieceDrop={({ sourceSquare, targetSquare }) => !!tryMove(sourceSquare, targetSquare)}
                boardOrientation={selected.color === 'black' ? 'black' : 'white'}
                customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
              />
              <div className="mt-3 flex flex-wrap gap-1">
                {selectedLine.moves.map((m, i) => (
                  <span key={i}
                    onClick={() => {
                      const c = new Chess(selectedLine.fen)
                      for (let j = 0; j <= i; j++) {
                        try { c.move(selectedLine.moves[j]) } catch { break }
                      }
                      reset(c.fen())
                    }}
                    className="text-xs font-mono text-accent2 bg-accent2/10 px-1.5 py-0.5 rounded cursor-pointer hover:bg-accent2/20">
                    {i % 2 === 0 ? `${Math.floor(i/2)+1}.` : ''}{m}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="w-64 shrink-0 border-l border-border bg-[#111827] p-4 flex flex-col gap-4 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="font-extrabold text-white text-lg leading-tight">{selectedLine.name}</div>
                {selectedLine.level && (
                  <span className={`text-[10px] font-bold uppercase shrink-0 px-2 py-0.5 rounded-full border ${
                    selectedLine.level === 'beginner' ? 'text-green-400 border-green-400/30 bg-green-400/10' :
                    selectedLine.level === 'intermediate' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' :
                    'text-red-400 border-red-400/30 bg-red-400/10'
                  }`}>
                    {selectedLine.level}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted mt-0.5 font-mono">{selectedLine.moves.join(' ')}</div>
            </div>

            <div className="bg-bg3 border border-border rounded-xl p-3 text-sm text-[#9CA3AF] leading-relaxed">
              💡 {selectedLine.idea}
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-accent2 uppercase tracking-wide">✅ Pros</div>
              {selectedLine.pros.map((p, i) => (
                <div key={i} className="text-xs text-[#9CA3AF] flex gap-1.5">
                  <span className="text-accent2 shrink-0">+</span>{p}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-danger uppercase tracking-wide">⚠️ Cons</div>
              {selectedLine.cons.map((c, i) => (
                <div key={i} className="text-xs text-[#9CA3AF] flex gap-1.5">
                  <span className="text-danger shrink-0">−</span>{c}
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('openings')}
              className="btn-gold text-sm mt-auto"
            >
              Practice This Opening →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
