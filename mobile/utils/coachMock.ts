import { MaterialCommunityIcons } from '@expo/vector-icons';

export type CoachSport = 'cricket' | 'badminton' | 'padel' | 'football';
export type DrillCategory = 'ALL' | 'TECHNIQUE' | 'TACTICS' | 'DRILLS' | 'PREP';

export interface CoachDrillPlan {
  title: string;
  objective: string;
  cues: string[];
  routine: {
    sets: string;
    reps: string;
    duration: string;
    setup: string;
  };
  proTip: string;
}

export interface CoachMessage {
  id: string;
  sender: 'COACH' | 'PLAYER';
  sport: CoachSport;
  text: string;
  timestamp: string;
  drillPlan?: CoachDrillPlan;
  disclaimer?: string;
}

export interface SportPromptSuggestion {
  id: string;
  sport: CoachSport;
  category: 'TECHNIQUE' | 'TACTICS' | 'DRILLS' | 'PREP';
  title: string;
  prompt: string;
  badge: string;
}

export const SPORT_CONFIG: Record<
  CoachSport,
  {
    label: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    courtType: string;
    circuitFocus: string;
    color: string;
    defaultVoiceQuery: string;
  }
> = {
  cricket: {
    label: 'CRICKET',
    icon: 'cricket',
    courtType: 'Tape-Ball & Nets',
    circuitFocus: 'Death Overs & Powerplay Execution',
    color: '#875646',
    defaultVoiceQuery: 'How can I bowl better yorkers at the death?',
  },
  badminton: {
    label: 'BADMINTON',
    icon: 'badminton',
    courtType: 'Wooden & Synthetic Courts',
    circuitFocus: 'Doubles Rotations & Net Kills',
    color: '#525C4B',
    defaultVoiceQuery: 'How do I improve my rear court footwork and jump smash?',
  },
  padel: {
    label: 'PADEL',
    icon: 'tennis',
    courtType: 'Enclosed Glass & Mesh',
    circuitFocus: 'Bandeja Depth & Rebound Reads',
    color: '#6E5B4B',
    defaultVoiceQuery: 'How should I position after hitting a bandeja to maintain the net?',
  },
  football: {
    label: 'FOOTBALL',
    icon: 'soccer',
    courtType: '7v7 Floodlit Turf',
    circuitFocus: 'Press Resistance & Half-Turn Passes',
    color: '#3D4438',
    defaultVoiceQuery: 'How can I improve my first touch under pressure on turf?',
  },
};

export const SUGGESTED_PROMPTS: SportPromptSuggestion[] = [
  // Cricket
  {
    id: 'cricket-01',
    sport: 'cricket',
    category: 'TECHNIQUE',
    title: 'Tape-Ball Yorker Drill',
    prompt: 'How do I nail toe-crushing yorkers in death overs with a taped tennis ball?',
    badge: 'BOWLING FORM',
  },
  {
    id: 'cricket-02',
    sport: 'cricket',
    category: 'TACTICS',
    title: 'Death Overs Field Setup',
    prompt: 'What field placement protects the leg-side boundary in the last 2 overs?',
    badge: 'TACTICAL SHAPE',
  },
  {
    id: 'cricket-03',
    sport: 'cricket',
    category: 'TECHNIQUE',
    title: 'Playing In-Swinging Pace',
    prompt: 'How do I prevent getting trapped LBW or bowled by late swing under lights?',
    badge: 'BATTING CUES',
  },
  {
    id: 'cricket-04',
    sport: 'cricket',
    category: 'DRILLS',
    title: 'Powerplay Lofted Drive Drill',
    prompt: 'Give me a 15-minute netting drill to clear the 30-yard circle safely.',
    badge: 'NET ROUTINE',
  },

  // Badminton
  {
    id: 'badminton-01',
    sport: 'badminton',
    category: 'TECHNIQUE',
    title: 'Rear-Court Jump Smash',
    prompt: 'How can I increase the steepness and speed of my rear-court jump smash?',
    badge: 'STEEP ANGLE',
  },
  {
    id: 'badminton-02',
    sport: 'badminton',
    category: 'TACTICS',
    title: 'Doubles Net Pinch Rotation',
    prompt: 'When should the front player pinch the T-line versus sliding to defend wide?',
    badge: 'DOUBLES SYNERGY',
  },
  {
    id: 'badminton-03',
    sport: 'badminton',
    category: 'DRILLS',
    title: 'Split-Step Reaction Drill',
    prompt: 'How do I time my split-step so I am not caught flat-footed on fast lifts?',
    badge: 'FOOTWORK AGILITY',
  },
  {
    id: 'badminton-04',
    sport: 'badminton',
    category: 'PREP',
    title: 'Forehand Net Drop Spin',
    prompt: 'What wrist action produces maximum tumbling spin on tight net drops?',
    badge: 'TOUCH & FEEL',
  },

  // Padel
  {
    id: 'padel-01',
    sport: 'padel',
    category: 'TECHNIQUE',
    title: 'Bandeja Depth & Control',
    prompt: 'What are the exact mechanical cues to hit a deep bandeja without giving up the net?',
    badge: 'OVERHEAD SHAPE',
  },
  {
    id: 'padel-02',
    sport: 'padel',
    category: 'TACTICS',
    title: 'Double-Glass Defense Reads',
    prompt: 'How do I read whether the ball will rebound off side glass first or back glass first?',
    badge: 'WALL POSITIONING',
  },
  {
    id: 'padel-03',
    sport: 'padel',
    category: 'TECHNIQUE',
    title: 'Víbora Aggressive Slice',
    prompt: 'How does the racket angle differ between a neutral bandeja and a venomous víbora?',
    badge: 'ATTACKING OVERHEAD',
  },
  {
    id: 'padel-04',
    sport: 'padel',
    category: 'DRILLS',
    title: 'Chiquita Transition Routine',
    prompt: 'What drill helps me drop a soft chiquita to opponent feet and sprint to the net?',
    badge: 'NET APPROACH',
  },

  // Football
  {
    id: 'football-01',
    sport: 'football',
    category: 'TACTICS',
    title: '7v7 Midfield Counter-Press',
    prompt: 'How should our central midfield trio trigger an immediate trap on turf turnovers?',
    badge: 'TURF PRESSING',
  },
  {
    id: 'football-02',
    sport: 'football',
    category: 'TECHNIQUE',
    title: 'First-Touch On The Half-Turn',
    prompt: 'How do I open my body shape when receiving back-to-goal under tight defender marking?',
    badge: 'FIRST TOUCH',
  },
  {
    id: 'football-03',
    sport: 'football',
    category: 'DRILLS',
    title: 'Low Driven Instep Finishing',
    prompt: 'What technique ensures crisp, grounded strikes across the keeper on small turf goals?',
    badge: 'CLINICAL FINISH',
  },
  {
    id: 'football-04',
    sport: 'football',
    category: 'PREP',
    title: 'Pre-Match 7v7 Activation',
    prompt: 'Give me a 10-minute dynamic warm-up checklist before an 8:30 PM floodlit match.',
    badge: 'MATCH READINESS',
  },
];

export const INITIAL_COACH_MESSAGES: Record<CoachSport, CoachMessage[]> = {
  cricket: [
    {
      id: 'm-cricket-init',
      sender: 'COACH',
      sport: 'cricket',
      text: 'Salaam Athlete. I am your Maidaan AI Tactical Coach. Whether you are prepping for tape-ball death overs under Gulberg floodlights or fine-tuning turf netting sessions, I provide structured mechanical breakdowns, field placements, and pressure routines.',
      timestamp: 'TACTICAL LAB · ONLINE',
      drillPlan: {
        title: 'TAPE-BALL FOUNDATION // THE BLOCKHOLE SPELL',
        objective: 'Zero in on the 6-inch corridor at the batsman toes to shut down late-innings boundaries.',
        cues: [
          'LOCK WRIST: Taped tennis balls whip with air pressure; firm wrist prevents floating full tosses.',
          'COLLAPSE FRONT KNEE SLIGHTLY: Lower your release height by 2 inches to ensure skidding trajectory.',
          'AIM AT BASE OF STUMPS: Never look at the batsman eyes during release; focus on the crease line.',
        ],
        routine: {
          sets: '4 spells',
          reps: '6 deliveries per spell',
          duration: '15 mins',
          setup: 'Place a shoe or chalk target 6 inches inside the batting crease.',
        },
        proTip: 'In Lahore floodlit games, moisture on turf makes the tape skid faster. Aim 3 inches fuller than usual.',
      },
    },
  ],
  badminton: [
    {
      id: 'm-badminton-init',
      sender: 'COACH',
      sport: 'badminton',
      text: 'Welcome to the court. I am calibrated for both doubles fast-paced flat exchanges and singles court-coverage stamina. Select a drill below or ask about jump smashes, net spinning, or split-step footwork timing.',
      timestamp: 'TACTICAL LAB · ONLINE',
      drillPlan: {
        title: 'DOUBLES AGILITY // THE T-LINE PINCH',
        objective: 'Intercept loose midcourt returns before they cross the service line.',
        cues: [
          'RACKET NOSE HIGH: Keep racket head at eyebrow level; never drop hands below waist.',
          'SPLIT-STEP TIMING: Bounce lightly onto the balls of your feet the exact millisecond the opponent racket strikes the shuttle.',
          'SHORT COMPACT TAP: Do not take a full backswing at the net; use finger squeeze for sharp downward punch.',
        ],
        routine: {
          sets: '5 rounds',
          reps: '20 rapid shuttle feeds',
          duration: '12 mins',
          setup: 'Partner feeds flat shuttles from rear court; front player intercepts on the volley.',
        },
        proTip: 'In doubles, 70% of points are won or lost in the first 3 strokes (Serve, Return, Third Shot). Master the push.',
      },
    },
  ],
  padel: [
    {
      id: 'm-padel-init',
      sender: 'COACH',
      sport: 'padel',
      text: 'Welcome to the 20x10 cage. Padel is a game of angles, patience, and net control. Power loses to positioning. Ask me about bandeja mechanics, reading double-glass rebounds, or lob management under pressure.',
      timestamp: 'TACTICAL LAB · ONLINE',
      drillPlan: {
        title: 'NET DOMINANCE // THE DEFENSIVE BANDEJA',
        objective: 'Handle deep defensive lobs without giving up your net position to the opposition.',
        cues: [
          'EARLY SHOULDER TURN: Turn sideways immediately upon lob contact; take racket back at head height.',
          'CONTACT AT 2 O\'CLOCK: Strike the ball slightly out in front with an open face to impart heavy backspin.',
          'REBOUND CONTROL: Direct the ball deep into the side glass corner so it dies low off the wall.',
        ],
        routine: {
          sets: '4 series',
          reps: '12 overhead feeds',
          duration: '15 mins',
          setup: 'Start at net position; backpedal diagonally on partner lob feed; recover immediately forward.',
        },
        proTip: 'Never smash a deep lob from behind the service line. A clean bandeja maintains net dominance with zero risk.',
      },
    },
  ],
  football: [
    {
      id: 'm-football-init',
      sender: 'COACH',
      sport: 'football',
      text: 'Good evening. For 7v7 turf matches, tactical discipline, high-tempo pressing, and rapid transitions dictate the scoreline. I can break down midfield shape, first touch under pressure, or goalkeeping distribution.',
      timestamp: 'TACTICAL LAB · ONLINE',
      drillPlan: {
        title: 'TURF TRANSITION // HALF-TURN RECEIVING',
        objective: 'Break defensive lines by receiving ground passes on the front foot to attack space immediately.',
        cues: [
          'SCAN OVER SHOULDER: Check the blind spot 1 second before the ball leaves teammate boot.',
          'OPEN HIPS 45 DEGREES: Do not face directly backwards; open your body towards the offensive goal.',
          'CUSHION WITH BACK FOOT: Take the first touch with the far-side instep into open running space.',
        ],
        routine: {
          sets: '3 sets',
          reps: '15 pass-and-turn reps',
          duration: '12 mins',
          setup: '2 passing cones 15 yards apart with a shadow defender dummy in the center.',
        },
        proTip: 'On synthetic grass, wet turf speeds up the ball roll by 20%. Soften your ankle joint upon initial touch.',
      },
    },
  ],
};

/**
 * DETERMINISTIC LOCAL MOCK TACTICAL RESPONDER
 *
 * Architectural Boundary:
 * - Current: Mobile UI -> Local deterministic mock responder
 * - Future: Mobile UI -> Maidaan Backend (/api/coach) -> AI Provider Abstraction (Gemini/OpenAI)
 *
 * Security & Implementation Rules:
 * - No AI provider SDKs (Gemini/OpenAI) imported in mobile
 * - No provider API keys in mobile source
 * - Zero direct external provider calls from mobile client
 * - Deterministic, sport-specific keyword and drill-matching logic
 */
export function generateCoachResponse(
  query: string,
  sport: CoachSport,
  skillLevel?: string
): CoachMessage {
  const lower = query.toLowerCase();
  const timestamp = 'JUST NOW';

  // Strict boundary check: Medical/Injury (Non-clinical athletic guardrail)
  if (
    lower.includes('pain') ||
    lower.includes('hurt') ||
    lower.includes('injury') ||
    lower.includes('tear') ||
    lower.includes('pull') ||
    lower.includes('swollen') ||
    lower.includes('doctor') ||
    lower.includes('medicine')
  ) {
    return {
      id: `ai-guardrail-${Date.now()}`,
      sender: 'COACH',
      sport,
      text: 'Athletic Safety First: As your AI Tactical Coach, I provide training drills, technique analysis, and match strategy only. I am strictly not permitted to diagnose injuries or prescribe clinical treatment.',
      timestamp,
      disclaimer:
        'Stop if the movement causes pain. For persistent or significant pain, please cease activity immediately and consult a qualified medical professional or physiotherapist.',
    };
  }

  // Strict boundary check: Betting / Gambling
  if (
    lower.includes('bet') ||
    lower.includes('odds') ||
    lower.includes('gamble') ||
    lower.includes('money') ||
    lower.includes('fix')
  ) {
    return {
      id: `ai-guardrail-${Date.now()}`,
      sender: 'COACH',
      sport,
      text: "Maidaan operates under zero-tolerance fair-play sports principles. I cannot provide betting odds, gambling advice, or match outcome wagering. Let's keep our focus on physical skill development and court tactics.",
      timestamp,
    };
  }

  // Sport-specific deterministic mock responses
  if (sport === 'cricket') {
    if (lower.includes('yorker') || lower.includes('death') || lower.includes('bowl')) {
      return {
        id: `ai-cricket-${Date.now()}`,
        sender: 'COACH',
        sport: 'cricket',
        text: 'Nailing tape-ball yorkers in the final overs requires strict wrist commitment. In tape-ball cricket, batsman back-lift is elevated to generate leverage; if your delivery is 4 inches too short, it gets dispatched.',
        timestamp,
        drillPlan: {
          title: 'DEATH SPELL // TARGET LOCK YORKER',
          objective: 'Hit the target shoe/crease cone 5 out of 6 deliveries under pressurized bowling tempo.',
          cues: [
            'STIFFEN WRIST SNAP: Do not roll your fingers; release through the index-finger seam channel.',
            'SHORTEN GATHER STEP: Shorten the penultimate stride by 3 inches to prevent overstriding and floating high tosses.',
            'FOLLOW-THROUGH DOWN THE PITCH: Run directly towards the non-striker to commit bodyweight forward.',
          ],
          routine: {
            sets: '4 overs',
            reps: '6 deliveries per over',
            duration: '18 mins',
            setup: 'Place 2 cones marking a 12-inch window on the popping crease.',
          },
          proTip: 'If bowling on wet concrete or turf, bowl from wide of the crease angled in toward middle stump.',
        },
      };
    }

    if (lower.includes('drive') || lower.includes('bat') || lower.includes('swing') || lower.includes('shot')) {
      return {
        id: `ai-cricket-${Date.now()}`,
        sender: 'COACH',
        sport: 'cricket',
        text: 'Against swinging tape-ball pace, the key error is committing the front foot too early. Wait for the trajectory to declare itself, then transfer weight down the line of the delivery.',
        timestamp,
        drillPlan: {
          title: 'BATTING CUE // FRONT-FOOT WEIGHT TRANSFER',
          objective: 'Present the full face of the bat while keeping head positioned directly over the impact zone.',
          cues: [
            'SOFT BOTTOM HAND: Dominant top hand controls the face angle to prevent aerial edges.',
            'HEAD OVER BALL: Nose and front knee must align directly over the point of contact.',
            'STIFLE THE SWING: Meet the ball 4 inches in front of your front pad before swing develops fully.',
          ],
          routine: {
            sets: '3 netting spells',
            reps: '15 throwdowns',
            duration: '20 mins',
            setup: 'Partner feeds underarm/sidearm throwdowns from 16 yards focusing on full-length deliveries.',
          },
          proTip: 'In floodlit powerplays, hit into the ground between cover and mid-off rather than scooping over mid-on.',
        },
      };
    }
  }

  if (sport === 'badminton') {
    if (lower.includes('smash') || lower.includes('rear') || lower.includes('jump') || lower.includes('footwork')) {
      return {
        id: `ai-badminton-${Date.now()}`,
        sender: 'COACH',
        sport: 'badminton',
        text: 'Steepness beats raw speed in competitive badminton. A flat smash is easily blocked back with interest. You need apex contact with aggressive wrist pronation.',
        timestamp,
        drillPlan: {
          title: 'REAR-COURT // APEX SCISSOR-KICK SMASH',
          objective: 'Contact the shuttle at maximum reach to drive the bird downwards at a 35-degree angle.',
          cues: [
            'CHEST OPEN TO CEILING: Non-racket arm points up at the bird for balance and spatial alignment.',
            'SCISSOR KICK RECOVERY: Right hip drives forward as left leg kicks back, propelling you 2 steps forward upon landing.',
            'PRONATE FOREARM: Snap forearm from thumb-inward to thumb-outward at terminal velocity.',
          ],
          routine: {
            sets: '4 intervals',
            reps: '12 overhead feeds',
            duration: '15 mins',
            setup: 'Coach feeds high clears from net; player executes jump smash and touches center T-line.',
          },
          proTip: 'Aim 18 inches inside the doubles tramlines or straight at the opponent hip pocket.',
        },
      };
    }

    if (lower.includes('net') || lower.includes('drop') || lower.includes('tumble')) {
      return {
        id: `ai-badminton-${Date.now()}`,
        sender: 'COACH',
        sport: 'badminton',
        text: 'Tumbling net drops force the opponent to lift from below the tape, setting up your partner for an immediate kill.',
        timestamp,
        drillPlan: {
          title: 'NET CRAFT // BRUSH & SLICE TUMBLE',
          objective: 'Impart spinning rotation on the cork so the shuttle tumbles over the white tape with zero clearance.',
          cues: [
            'LOOSE FINGERTIP GRIP: Hold the racket handle with finger pads, not the palm.',
            'SLICING ACTION: Move racket face across the cork from 8 o\'clock to 2 o\'clock.',
            'STAY LOW: Keep eyes level with the tape to gauge exact clearance.',
          ],
          routine: {
            sets: '5 rounds',
            reps: '20 shuttle feeds',
            duration: '10 mins',
            setup: 'Hand-feed shuttles from opposite side of net 2 inches above tape.',
          },
          proTip: 'Never rush the net drop. Wait for the shuttle to settle into your strike zone before executing the brush.',
        },
      };
    }
  }

  if (sport === 'padel') {
    if (lower.includes('bandeja') || lower.includes('overhead') || lower.includes('deep') || lower.includes('position')) {
      return {
        id: `ai-padel-${Date.now()}`,
        sender: 'COACH',
        sport: 'padel',
        text: 'The bandeja is padel\'s cornerstone stroke. It is NOT a smash; it is a tactical territorial weapon designed to keep opponents pinned at the back while you hold the net.',
        timestamp,
        drillPlan: {
          title: 'OVERHEAD CONTROL // TACTICAL BANDEJA',
          objective: 'Drive the ball low into the corner glass to prevent opponent counter-attacks.',
          cues: [
            'RACKET NOSE HIGH: Prepare racket behind head with open face parallel to the sky.',
            'STRIKE ON DESCENT: Hit the ball at eye level rather than at highest reach.',
            'CUT UNDERNEATH: Slice the ball diagonally downward into the side-wall junction.',
          ],
          routine: {
            sets: '4 series',
            reps: '15 feeds',
            duration: '16 mins',
            setup: 'Feeder lobs from back of court; player executes bandeja to the opposite corner.',
          },
          proTip: 'Aim for the metal mesh fence occasionally — unpredictable bounces off the wire win crucial points.',
        },
      };
    }

    if (lower.includes('wall') || lower.includes('glass') || lower.includes('rebound')) {
      return {
        id: `ai-padel-${Date.now()}`,
        sender: 'COACH',
        sport: 'padel',
        text: 'When defending double-glass rebounds, the common mistake is facing the front wall while the ball travels behind you. You must turn with the ball trajectory.',
        timestamp,
        drillPlan: {
          title: 'WALL DEFENSE // 360-DEGREE GLASS READ',
          objective: 'Turn with the bounce and strike the ball as it separates from the second glass panel.',
          cues: [
            'STAY GLUED TO THE CORNER: Do not rush forward; let the ball hit both walls.',
            'COMPACT SWING: Racket preparation must be minimal inside the corner envelope.',
            'LOB HIGH TO RECOVER: Clear the ball over opponent heads to reset position.',
          ],
          routine: {
            sets: '3 sets',
            reps: '20 wall feeds',
            duration: '14 mins',
            setup: 'Partner hits driving balls into side wall; player tracks bounce and lobs deep.',
          },
          proTip: 'If the ball hits the side glass below knee height, it will die on the back glass. Strike it off the first rebound.',
        },
      };
    }
  }

  if (sport === 'football') {
    if (lower.includes('press') || lower.includes('7v7') || lower.includes('tactic')) {
      return {
        id: `ai-football-${Date.now()}`,
        sender: 'COACH',
        sport: 'football',
        text: 'In 7v7 turf matches, individual pressing gets bypassed with a simple wall pass. Pressing must be collective, triggered by a heavy touch or backward pass.',
        timestamp,
        drillPlan: {
          title: 'TURF STRUCTURE // MIDFIELD PRESSING TRIGGER',
          objective: 'Force turnovers in opponent half within 4 seconds of losing possession.',
          cues: [
            'LOCK THE WIDE CHANNEL: Force the ball carrier toward the sideline, cutting off central passes.',
            'COVER SHADOW: Position body so the passing lane to the opponent center-forward is blocked.',
            'SPRINT ON THE BACK-PASS: When opponent plays backwards to goalkeeper, entire unit steps up 5 yards.',
          ],
          routine: {
            sets: '4 blocks',
            reps: '3 mins live play',
            duration: '15 mins',
            setup: '3v3 + 1 neutral player in a 25x20 yard grid.',
          },
          proTip: 'On small turf pitches, 80% of goals come from turnovers inside the attacking third. Win the ball high.',
        },
      };
    }

    if (lower.includes('touch') || lower.includes('control') || lower.includes('pressure')) {
      return {
        id: `ai-football-${Date.now()}`,
        sender: 'COACH',
        sport: 'football',
        text: 'On fast turf, absorbing pressure requires receiving on the half-turn with an open body shape so your first touch moves you away from the defender.',
        timestamp,
        drillPlan: {
          title: 'FIRST-TOUCH MASTERY // HALF-TURN ESCAPE',
          objective: 'Receive back-to-goal and turn in a single fluid motion into open passing lanes.',
          cues: [
            'SHOULDER CHECK: Scan your blind spot twice before the ball reaches your feet.',
            'OPEN BODY SHAPE: Angle hips 45 degrees so you can see both the passer and target space.',
            'CUSHION WITH FAR FOOT: Take the ball with the outside of your far foot to protect with your body.',
          ],
          routine: {
            sets: '4 sets',
            reps: '15 pass-and-turn reps',
            duration: '12 mins',
            setup: 'Passer feeds firmly from 15 yards; player touches past mannequin into target mini-goal.',
          },
          proTip: 'Never stop the ball dead on artificial grass under pressing; keep it moving with your first stride.',
        },
      };
    }

    if (lower.includes('finish') || lower.includes('shoot') || lower.includes('goal')) {
      return {
        id: `ai-football-${Date.now()}`,
        sender: 'COACH',
        sport: 'football',
        text: 'On small turf goals, power strikes often sail over the crossbar or bounce off the keeper. Precision low driven strikes inside the side netting are the highest percentage finish.',
        timestamp,
        drillPlan: {
          title: 'FINISHING PRECISION // LOW DRIVEN CORNERS',
          objective: 'Slot finishes past keeper dive within 2 touches of entering the penalty box.',
          cues: [
            'PLANT FOOT BESIDE BALL: Point non-kicking toes directly at target corner.',
            'LOCKED ANKLE: Strike through center of ball with inside-instep, keeping knee over ball.',
            'DO NOT LEAN BACK: Chest stays tilted forward on follow-through to keep trajectory grounded.',
          ],
          routine: {
            sets: '5 rounds',
            reps: '10 strikes each foot',
            duration: '12 mins',
            setup: 'Receive pass at top of box, take 1 touch past dummy cone, strike low across goal.',
          },
          proTip: 'Look at the keeper front foot. Shoot opposite to their weight shift to catch them frozen.',
        },
      };
    }
  }

  // Default customized tactical response
  const config = SPORT_CONFIG[sport];
  const levelDescriptor = skillLevel ? ` (${skillLevel} circuit level)` : '';
  return {
    id: `ai-tactical-${Date.now()}`,
    sender: 'COACH',
    sport,
    text: `Understood. Analyzing tactical mechanics for ${config.label}${levelDescriptor}. Here is your tailored session breakdown:`,
    timestamp,
    drillPlan: {
      title: `${config.label} ADAPTATION // FORM & EXECUTION`,
      objective: `Master the essential movement cues for ${query.slice(0, 40)}...`,
      cues: [
        'ALIGNMENT: Maintain balanced athletic posture before initiating stroke or pass.',
        'TIMING & IMPACT: Meet the ball at the optimum contact point in front of your body center.',
        'RECOVERY: Immediately reset to ready position within 0.8 seconds of ball release.',
      ],
      routine: {
        sets: '3 sets',
        reps: '12 focused repetitions',
        duration: '15 mins',
        setup: `Standard ${config.courtType} setup focusing on repeatable technical habits.`,
      },
      proTip: 'Consistency beats flashiness in recreational league matches. Focus on clean fundamentals.',
    },
  };
}
