# ✅ Timer Fixes - Visual Testing Guide

## Quick Test (5 minutes)

### Setup
1. Open http://localhost:3000 (frontend running)
2. Enter teams and debate topic
3. Click "INICIAR DEBATE"

---

## Test 1: Timer Starts PAUSED ⏸️

**What to look for:**

```
┌─────────────────────────────────────┐
│  DEBATE SCREEN                      │
├─────────────────────────────────────┤
│                                     │
│  Team A         Round 1         Team B
│                 3:00
│                                     │
│  ✅ Timer shows 3:00                │
│  ✅ NOT counting down               │
│  ✅ Status says "CONFIGURACIÓN"     │
│  ✅ Play button is available        │
│                                     │
│        [◀ Turno A] [▶] [▶ Turno B]   │
│                                     │
└─────────────────────────────────────┘
```

**What to do:**
1. Look at the timer display
2. Wait 3 seconds
3. **Expected:** Timer still shows "3:00" (not counting)
4. **If timer counts down:** ❌ Bug - Auto-start still happening

✅ **PASS**: Timer is paused and showing initial time

---

## Test 2: Play Button Starts Timer ▶️

**What to look for:**

```
Timer Before:                Timer After (1 sec):
3:00                         2:59
⏸ PAUSADO                    ► EN DIRECTO

Visual countdown:
3:00 → 2:59 → 2:58 → 2:57 → ...
```

**What to do:**
1. Timer is paused on 3:00
2. Click Play button (center)
3. **Expected:** Timer immediately starts counting
4. Watch it count: 3:00 → 2:59 → 2:58 → 2:57

✅ **PASS**: Timer counts down when Play is clicked

---

## Test 3: Pause Button Stops Timer ⏸️

**What to look for:**

```
Timer Counting:              Timer Paused:
2:30 → 2:29 → 2:28          2:28 (stays still)
► EN DIRECTO                ⏸ PAUSADO
```

**What to do:**
1. Timer is counting
2. Click Play button (toggles to Pause)
3. **Expected:** Timer freezes at current time
4. Wait 3 seconds
5. **Expected:** Timer still shows same number

✅ **PASS**: Timer pauses when clicked during countdown

---

## Test 4: Turno B Skips and Auto-Starts 🎬

**What to look for:**

```
Round 1 (Team A):           Click "Turno B":        Result:
Round 1                     Turno B clicked         Round 2
Introducción                                        Refutador 1
3:00 (counting)                                     4:00 (auto-counting!)

Flow:
1. Click "Turno B"
   ↓
2. Instantly shows Round 2
   ↓
3. Timer displays 4:00
   ↓
4. IMMEDIATELY starts: 4:00 → 3:59 → 3:58
   (NO MANUAL PLAY CLICK NEEDED)
```

**What to do:**
1. Timer is on Round 1, counting normally
2. Click "Turno B" button (right button)
3. **Expected:** 
   - Round number changes to 2
   - Timer resets to 4:00
   - Timer AUTOMATICALLY starts counting
   - You do NOT need to click Play
4. Watch it count: 4:00 → 3:59 → 3:58

✅ **PASS**: Turno B button skips round AND auto-starts timer

---

## Test 5: Turno A Returns & Pauses ◀️

**What to look for:**

```
Round 2 (Team B):           Click "Turno A":        Result:
Round 2                     Turno A clicked         Round 1
4:00 (counting)                                     3:00 (paused!)

Flow:
1. Click "Turno A"
   ↓
2. Instantly shows Round 1
   ↓
3. Timer resets to 3:00
   ↓
4. Timer STOPS (doesn't auto-start)
   ↓
5. Status shows "PAUSADO"
```

**What to do:**
1. Timer is on Round 2, counting
2. Click "Turno A" button (left button)
3. **Expected:**
   - Round number changes to 1
   - Timer resets to 3:00
   - Timer PAUSES (stops counting)
   - Status shows "PAUSADO" (not "EN DIRECTO")
4. Wait 3 seconds
5. **Expected:** Timer still shows "3:00"

✅ **PASS**: Turno A button goes back and pauses timer

---

## Test 6: Independent Team Timers 👥

**What to look for:**

```
Round 1 (Team A Speaking):
┌─────────────────────────┐
│ Team A ◀ (GLOW)         │
│ ===== 2:45 =====        │
│ Timer actively          │
│ counting down            │
└─────────────────────────┘
           TIMER COUNTING ⏳

┌─────────────────────────┐
│ Team B ▶ (dim)          │
│ ===== 2:45 =====        │
│ Waiting (no glow)       │
│ Shows same time but     │
│ different visual state  │
└─────────────────────────┘
           NOT ACTIVE (just reference)

Click "Turno B" →

Round 2 (Team B Speaking):
┌─────────────────────────┐
│ Team A ▶ (dim)          │
│ ===== 4:00 =====        │
│ Waiting (no glow)       │
└─────────────────────────┘
           INACTIVE

┌─────────────────────────┐
│ Team B ◀ (GLOW)         │
│ ===== 4:00 =====        │
│ Timer actively          │
│ counting down            │
└─────────────────────────┘
           TIMER COUNTING ⏳
```

**What to do:**
1. On Round 1 (Team A speaking)
2. Look at Team A timer - has glow effect
3. Look at Team B timer - dim/inactive
4. Both show same time (correct for this round)
5. Click "Turno B" → advance to Round 2
6. Now Team B timer has glow
7. Team A timer is dim/inactive
8. **Expected:** Timer always counts for active team only

✅ **PASS**: Only the speaking team's timer is active

---

## Test 7: Full Round Sequence 🔄

**What to do:**
1. Start debate (paused at Round 1)
2. Click Play → counts to 0
3. When time hits 0, timer stops automatically
4. Click "Turno B" → Round 2 auto-starts
5. Click Play on Round 2 → counts down
6. Click "Turno A" → Back to Round 1 (paused)
7. Click Play → Continues Round 1
8. Repeat process through multiple rounds

**Expected Flow:**
```
Round 1 [Play] → Counting → [Turno B] 
Round 2 [Auto-counts] → [Turno A]
Round 1 [Paused] → [Play] → Counting
... (repeat) ...
Round 8 [Counting] → [Timer hits 0] → Debate ends
```

✅ **PASS**: Can navigate and control any round

---

## Test 8: Console Logs Confirm Fixes 🖥️

Open DevTools (F12) and check Console tab:

**What to look for:**

```
✅ CORRECT LOGS:
Play/Pause - Estado actual: setup
[Timer counts]
Turno B - Skip to next round

❌ WRONG LOGS (would indicate bug):
🎬 Auto-starting debate from setup... (auto-start still happening)
[Timer immediately starts without Play click]
```

**What to do:**
1. Open DevTools (F12)
2. Click Console tab
3. Perform tests above
4. Look for logs matching expected behavior
5. Should NOT see: "Auto-starting debate from setup"

✅ **PASS**: Logs show correct flow without auto-start

---

## Checklist: All Tests

| Test | Status | Notes |
|------|--------|-------|
| Timer starts PAUSED | ⬜ | Should show time but not count |
| Play starts timer | ⬜ | Immediately begins countdown |
| Pause stops timer | ⬜ | Freezes at current time |
| Turno B auto-advances | ⬜ | Skips round + auto-starts |
| Turno A goes back | ⬜ | Returns to previous, pauses |
| Independent timers | ⬜ | Only active team counts |
| Round sequence | ⬜ | Can navigate freely |
| Console logs | ⬜ | No auto-start logs |

---

## Expected Behavior Summary

### Before Fixes ❌
- Timer auto-starts immediately
- Both team timers count in sync
- Turno buttons don't auto-start
- Confusing automatic behavior
- Hard to control

### After Fixes ✅
- Timer starts PAUSED
- User clicks Play to start
- Turno B button advances AND starts
- Clear manual control
- Predictable behavior

---

## If You Find Issues 🔍

### Issue: Timer still auto-starts
1. Check if auto-start useEffect was removed
2. Verify commit c342b75 applied
3. Refresh browser (Ctrl+R)
4. Restart dev server: `npm start`

### Issue: Turno B doesn't auto-start
1. Check if `skipToNextRound` is implemented
2. Verify `handleNext()` calls `skipToNextRound()`
3. Check console logs for errors

### Issue: Timer still shows both teams
1. This is EXPECTED - shows current round time
2. Only the active team's "glow" changes
3. Visual indicator shows who's speaking

---

## Video Testing Script (Optional)

If recording a test video:

```
0:00 - Click INICIAR DEBATE
       → Timer shows paused on 3:00

0:05 - Click Play button
       → Timer auto-counts 3:00 → 2:59 → 2:58

0:15 - Click Turno B button
       → Changes to Round 2, 4:00
       → Timer auto-counts 4:00 → 3:59

0:25 - Click Turno A button
       → Changes to Round 1, 3:00
       → Timer paused (not counting)

0:35 - Click Play button
       → Timer resumes from paused state

0:45 - Conclusion: All tests PASS ✅
```

---

## Quick Pass/Fail Checklist

### PASS ✅ if:
- [x] Timer starts paused at game start
- [x] Play button starts the countdown
- [x] Turno B button skips + auto-starts
- [x] Turno A button returns + pauses
- [x] Timer can be controlled with Play/Pause
- [x] Console shows no auto-start log

### FAIL ❌ if:
- [x] Timer starts counting automatically
- [x] Turno buttons don't advance round
- [x] Both team timers always in sync
- [x] Can't pause the timer
- [x] Auto-start log appears in console

---

## Next Steps

✅ All tests passing?
→ Commit the fixes
→ Push to repository
→ Ready for production!

❌ Tests failing?
→ Check commit c342b75 applied
→ Review TIMER_BUGS_FIXED.md
→ Restart dev server
→ Try again

---

**Status: Ready for Testing** 🚀

Test duration: ~5-10 minutes  
Difficulty: Easy  
Success criterion: All 8 tests pass
