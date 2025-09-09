import { createPathConfigForStaticNavigation } from "@react-navigation/native";

const firstAidTips = [
  {
    id: '1',
    title: 'Burns',
    steps: [
      'Cool the burn under cool running water for at least 10 minutes.',
      'Remove any clothing or jewelry near the burn, unless stuck.',
      'Cover the burn with a sterile, non-stick bandage.',
      'Do not apply creams, ice, or greasy substances.',
      'Seek medical help if the burn is large, deep, or on the face/hands/genitals.'
    ]
  },
  {
    id: '2',
    title: 'Nosebleed',
    steps: [
      'Sit upright and lean forward to avoid swallowing blood.',
      'Pinch the soft part of the nose firmly for 10-15 minutes.',
      'Breathe through the mouth while pinching.',
      'Avoid blowing the nose or bending down after bleeding stops.',
      'Seek medical care if bleeding lasts over 20 minutes or recurs frequently.'
    ]
  },
  {
    id: '3',
    title: 'Choking (Adult)',
    steps: [
      'Ask the person: “Are you choking?” and encourage coughing if they can.',
      'If they cannot breathe, give 5 sharp back blows between the shoulder blades.',
      'If still choking, perform 5 abdominal thrusts (Heimlich maneuver).',
      'Alternate between back blows and abdominal thrusts until it clears.',
      'Call emergency services if the person becomes unconscious.'
    ]
  },
  {
    id: '4',
    title: 'Cuts and Bleeding',
    steps: [
      'Wash hands and wear gloves if available.',
      'Apply firm pressure with a clean cloth to stop bleeding.',
      'Rinse small cuts under water and clean with antiseptic.',
      'Cover with sterile dressing or bandage.',
      'Seek help if bleeding is severe or won’t stop.'
    ]
  },
  {
    id: '5',
    title: 'Sprains and Strains',
    steps: [
      'Use R.I.C.E method: Rest, Ice, Compression, Elevation.',
      'Apply an ice pack wrapped in cloth for 15-20 minutes every 2-3 hours.',
      'Avoid putting weight on the injured area.',
      'Wrap with an elastic bandage to reduce swelling.',
      'Seek care if severe pain or no improvement after 2 days.'
    ]
  },
  {
    id: '6',
    title: 'Fractures (Broken Bones)',
    steps: [
      'Do not move the affected area unless absolutely necessary.',
      'Immobilize with a splint or sling if trained to do so.',
      'Apply a cold pack to reduce swelling.',
      'Do not try to realign the bone.',
      'Seek immediate medical attention.'
    ]
  },
  {
    id: '7',
    title: 'Heatstroke',
    steps: [
      'Move the person to a cool, shaded area.',
      'Remove excess clothing and apply cool, wet cloths.',
      'Fan the person or sponge with cool water.',
      'Encourage small sips of water if they are conscious.',
      'Call emergency services immediately.'
    ]
  },
  {
    id: '8',
    title: 'Shock',
    steps: [
      'Lay the person down and elevate their legs if no injury.',
      'Keep them warm using a blanket or jacket.',
      'Do not give anything to eat or drink.',
      'Stay calm and reassure the person.',
      'Call emergency services immediately.'
    ]
  },
  {
    id: '9',
    title: 'Poisoning',
    steps: [
      'Try to find out what substance was taken.',
      'Call poison control or emergency services right away.',
      'Do not induce vomiting unless told to by professionals.',
      'If inhaled poison, move the person to fresh air immediately.',
      'If skin contact, rinse with water for 15-20 minutes.'
    ]
  },
  {
    id: '10',
    title: 'Seizures',
    steps: [
      'Stay calm and keep people away.',
      'Cushion the person’s head and lay them on their side.',
      'Do not hold them down or put anything in their mouth.',
      'Time the seizure—call emergency help if it lasts over 5 minutes.',
      'Stay with the person until they are fully alert.'
    ]
},
{
  id: '11',
  title: 'Snake Bites',
  steps: [
    'Stay calm and still to slow the spread of venom.',
    'Keep the bitten limb immobilized and at or slightly below heart level.',
    'Remove any tight clothing, jewelry, or accessories near the bite area.',
    'Do not suck out the venom or apply ice or a tourniquet.',
    'Call emergency services immediately or get the person to a hospital as fast as possible.'
  ]
},
{
  id: '12',
  title: 'CPR (Cardiopulmonary Resuscitation)',
  steps: [
    'Check the area for safety before approaching the person. (Ensure there is no danger to you or them.)',
    'Call emergency services immediately or have someone else do it. (Get professional help on the way.)',
    'Check if the person is breathing and has a pulse for no more than 10 seconds. (Look for chest movement, listen for breath, feel for a pulse.)',
    'Place the heel of one hand on the center of the chest, the other hand on top. (Keep arms straight and shoulders above hands.)',
    'Push hard and fast at a depth of 5–6 cm for adults, 100–120 compressions per minute. (Use the beat of “Stayin’ Alive” as a guide.)',
    'If trained, give 2 rescue breaths after every 30 compressions, making sure the chest rises. (Tilt the head back, lift the chin, pinch the nose.)',
    'For children, use one hand and push about 5 cm deep; for infants, use two fingers and push about 4 cm deep. (Be gentle but firm.)',
    'Continue CPR until the person starts breathing, a defibrillator is available, or professional help takes over. (Do not stop unless absolutely necessary.)'
  ]
}
];


export default firstAidTips;
