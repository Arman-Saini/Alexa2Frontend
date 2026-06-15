export interface RoomBounds {
  xMin: number; xMax: number;
  zMin: number; zMax: number;
}

export const ROOM_BOUNDS: Record<string, RoomBounds> = {
  'livingRoom':    { xMin:  -3, xMax:  13, zMin: -10, zMax:  2 },
  'masterBedroom': { xMin: -13, xMax:  -3, zMin: -10, zMax:  0 },
  'bathroom':      { xMin: -13, xMax:  -3, zMin:   0, zMax:  4 },
  'homeOffice':    { xMin: -13, xMax:  -3, zMin:   4, zMax: 10 },
  'kitchenDining': { xMin:   3, xMax:  13, zMin:   2, zMax: 10 },
  'hallway':       { xMin:  -3, xMax:   3, zMin:   2, zMax: 10 },
};
