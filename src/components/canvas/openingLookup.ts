import anchorLayout from '../../constants/anchorLayout.json';

interface OpeningRef {
  id: string;
  model: string;
  roomId: string;
}

function humanizeRoomId(roomId: string): string {
  return roomId.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

function findOpening(id: string, kind: 'doors' | 'windows'): OpeningRef | null {
  for (const [roomId, roomDef] of Object.entries(anchorLayout.rooms)) {
    const list = (roomDef as unknown as Record<string, { id: string; model: string }[] | undefined>)[kind];
    const found = list?.find((o) => o.id === id);
    if (found) return { id: found.id, model: found.model.replace(/^(?:quat|furn):/, ''), roomId };
  }
  return null;
}

export function findDoor(id: string) {
  return findOpening(id, 'doors');
}

export function findWindow(id: string) {
  return findOpening(id, 'windows');
}

export { humanizeRoomId };
