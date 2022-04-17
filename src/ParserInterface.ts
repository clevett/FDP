import {
  DiceRoller,
  FateExpr,
  FullRoll,
  NumberType,
  RollExpr,
  RollTypeResult,
  RootType,
} from "../../dice-roller-parser/src";
import { DiceBoxResult, DieGroups } from "./types";

let externalCount = 0;

class ParserInterface {
  dieGroups: DieGroups[] = [];
  finalResults?: RollTypeResult;
  parsedNotation?: RootType;
  rollParser?: DiceRoller;
  rollsAsFloats: number[] = [];

  constructor() {
    this.rollsAsFloats = [];
    this.dieGroups = [];
    this.parsedNotation = undefined;
    this.finalResults = undefined;

    this.initParser();
  }

  // Set up the parser with our custom random function
  initParser() {
    this.rollParser = new DiceRoller((rolls = this.rollsAsFloats) => {
      if (rolls.length > 0) {
        return rolls[externalCount++];
      } else {
        return Math.random();
      }
    });
  }

  updateDieGroups(obj: FullRoll) {
    if (obj && obj.count && obj.die) {
      const typeCheck = (v: RollExpr): v is NumberType => {
        return v.type === "number" && typeof v.value === "number";
      };

      const fateTypeCheck = (v: RollExpr | FateExpr): v is FateExpr => {
        return v.type === "fate";
      };

      if (
        typeCheck(obj.count) &&
        !fateTypeCheck(obj.die) &&
        typeCheck(obj.die)
      ) {
        this.dieGroups.push({
          qty: obj.count.value,
          sides: obj.die.value,
          mods: obj.mods,
        });
      }
    }
  }

  parseNotation(notation: string) {
    // clean out the gunk
    this.clear();
    // parse the raw string notation
    this.parsedNotation = this.rollParser?.parse(notation);

    // create a new object of just dice needed for rolling
    const findDie = (obj: FullRoll) => this.updateDieGroups(obj);

    if (this.parsedNotation) {
      this.recursiveSearch(this.parsedNotation, "die", [], findDie);
    }

    return this.dieGroups;
  }

  rollNotation(notationObject: RootType) {
    this.finalResults = this.rollParser?.rollParsed(notationObject);
    return this.finalResults;
  }

  clear() {
    externalCount = 0;
    this.rollsAsFloats = [];
    this.dieGroups = [];
    this.parsedNotation = undefined;
    this.finalResults = undefined;
  }

  // make this static for use by other systems?
  recursiveSearch(
    obj: RootType,
    searchKey: string,
    results: unknown[] = [],
    callback?: Function
  ) {
    const r = results;

    Object.keys(obj).forEach((key) => {
      //@ts-expect-error TS doesn't like using strings to find keys
      const value: any = obj[key];

      if (key === searchKey) {
        r.push(value);

        if (callback && typeof callback === "function") {
          callback(obj);
        }
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        this.recursiveSearch(value, searchKey, r, callback);
      }
    });

    return r;
  }

  incrementId(key: number | string) {
    const string = key.toString();
    const splitKey = string.split(".");
    if (splitKey[1]) {
      return `${splitKey[0]}.${parseInt(splitKey[1]) + 1}`;
    } else {
      return `${splitKey[0]}.${1}`;
    }
  }

  // TODO: this needs to return a object of rolls that need to be rolled again,
  handleRerolls(rollResults: unknown[] = []) {
    const rerolls: unknown[] = [];
    // rollResults.forEach((group, groupId) => {
    //   // check for 'mods' - might need to reroll when encountered
    //   if (group.mods?.length > 0) {
    //     const successTest = (roll, mod, target) => {
    //       switch (mod) {
    //         case ">":
    //           return roll >= target;
    //         case "<":
    //           return roll <= target;
    //         case "=":
    //         default:
    //           return roll === target;
    //       }
    //     };
    //     const rollIds = group.rolls.map((roll) => roll.rollId);
    //     const alreadyReRolled = (id) => {
    //       // if the incremented id exists in the group then this die has been processed previously
    //       const increment = this.incrementId(id);
    //       return rollIds.includes(increment);
    //     };
    //     group.mods.forEach((mod) => {
    //       // TODO: handle each type of mod that would trigger a reroll
    //       const rollsCopy = { ...group.rolls };
    //       switch (mod.type) {
    //         case "explode":
    //         case "compound":
    //           // for compound: the additional rolls for each dice are added together as a single "roll" (calculated by the parser)
    //           Object.entries(rollsCopy).forEach(([key, die]) => {
    //             const max = die.sides;
    //             const target = mod.target?.die?.value || max;
    //             const op = mod.target?.mod || ">";
    //             if (
    //               successTest(die.value, op, target) &&
    //               !alreadyReRolled(die.rollId)
    //             ) {
    //               rerolls.push({
    //                 groupId,
    //                 rollId: this.incrementId(die.rollId),
    //                 sides: die.sides,
    //                 qty: 1,
    //               });
    //             }
    //           });
    //           break;
    //         case "penetrate":
    //           // if die = max then it explodes, but -1 on explode result (calculated by the parser)
    //           // ! Turning this into a future feature or option "HackMaster: true" - option for plugin or override
    //           // if die is d20 and explodes then it's followed by a d6
    //           // if die is d100 and explodes then it's followed by a d20
    //           // this gets complicated for d100 and d20 rerolls
    //           // d20 explode triggers a d6. The parser will parse extra die value as a d20 and not a d6. So the value as float is incorrect. Same for d100. Need to do some extra math. Would want to convert the value here, perhaps with a flag on the reroll
    //           // TODO: explosions beyond the first are being dropped, probably because their value has been decremented by 1 and no longer register as meeting the explode success criteria
    //           Object.entries(rollsCopy).forEach(([key, die]) => {
    //             const max = die.sides;
    //             const target = mod.target?.value?.value || max;
    //             const op = mod.target?.mod || "=";
    //             if (
    //               successTest(die.value, op, target) &&
    //               !alreadyReRolled(die.rollId)
    //             ) {
    //               rerolls.push({
    //                 groupId,
    //                 rollId: this.incrementId(die.rollId),
    //                 // sides: die.sides === 100 ? 20 : die.sides === 20 ? 6 : die.sides,
    //                 sides: die.sides,
    //                 qty: 1,
    //               });
    //             }
    //           });
    //           break;
    //         case "reroll":
    //           Object.entries(rollsCopy).forEach(([key, die]) => {
    //             if (
    //               successTest(
    //                 die.value,
    //                 mod.target.mod,
    //                 mod.target.value.value
    //               ) &&
    //               !alreadyReRolled(die.rollId)
    //             ) {
    //               rerolls.push({
    //                 groupId,
    //                 rollId: this.incrementId(die.rollId),
    //                 sides: die.sides,
    //                 qty: 1,
    //               });
    //             }
    //           });
    //           break;
    //         case "rerollOnce":
    //           Object.entries(rollsCopy).forEach(([key, die]) => {
    //             const target = mod.target?.value?.value;
    //             const op = mod.target.mod;
    //             if (
    //               successTest(die.value, op, target) &&
    //               !alreadyReRolled(die.rollId) &&
    //               !die.rollId.toString().includes(".")
    //             ) {
    //               rerolls.push({
    //                 groupId,
    //                 rollId: this.incrementId(die.rollId),
    //                 sides: die.sides,
    //                 qty: 1,
    //               });
    //             }
    //           });
    //           break;
    //       }
    //     }); // end mods forEach
    //   }
    // }); // end results forEach

    return rerolls;
  }

  updateFloats(rolls: DiceBoxResult[]) {
    rolls.forEach((roll) => {
      this.rollsAsFloats.push((roll.value - 1) / roll.sides);
    });
  }

  parseFinalResults(rollResults: DiceBoxResult[] = []) {
    // do the final parse
    this.updateFloats(rollResults);

    const finalResults =
      this.parsedNotation && this.rollParser?.rollParsed(this.parsedNotation);

    // save a reference to the final results
    this.finalResults = finalResults;

    // after parse clear out global variables
    externalCount = 0;
    this.rollsAsFloats = [];

    return finalResults;
  }
}

export default ParserInterface;
