# Month Selector Feature - Visual Documentation

This document provides visual mockups of the new month selector feature for the Group Stats view.

## Feature Overview

The refactored Group Stats view now displays ALL group members (not just top 3) with a month selection dropdown.

## Visual Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ Group Stats View                                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ [Stats] [Sightings] [Members]  ← Tabs                       │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Group Total (2026)                                       │ │
│ │ ┌───────────────────────────────────────────────────┐   │ │
│ │ │ 👥  Birdwatchers United                6 spp      │   │ │
│ │ └───────────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Points Leaders (2026)                                    │ │
│ │ ┌───────────────────────────────────────────────────┐   │ │
│ │ │ 🥇  Alice Anderson                    8 pts       │   │ │
│ │ │ 🥈  Bob Brown                         2 pts       │   │ │
│ │ │ 🥉  Charlie Chen                      1 pts       │   │ │
│ │ └───────────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Top Birdwatchers (2026)                                  │ │
│ │ ┌───────────────────────────────────────────────────┐   │ │
│ │ │ 🥇  Alice Anderson                    5 spp       │   │ │
│ │ │ 🥈  Bob Brown                         4 spp       │   │ │
│ │ │ 🥉  Charlie Chen                      4 spp       │   │ │
│ │ └───────────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ Select Month                                         │ │ │
│ │ │ ┌─────────────────────────────────────────────────┐ │ │ │
│ │ │ │ February        ▼  ← MONTH SELECTOR DROPDOWN    │ │ │ │
│ │ │ └─────────────────────────────────────────────────┘ │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                           │ │
│ │ Top Birdwatchers (February)                              │ │
│ │ ┌───────────────────────────────────────────────────┐   │ │
│ │ │ 🥇  Alice Anderson          [Photo]   5 spp       │ ← │ │
│ │ │ 🥈  Bob Brown               [Photo]   4 spp       │   │ │
│ │ │ 🥈  Charlie Chen            [Photo]   4 spp       │   │ │
│ │ │ #4  David Davis             [Photo]   2 spp       │   │ │
│ │ │ #5  Eve Evans               [Photo]   1 spp       │   │ │
│ │ └───────────────────────────────────────────────────┘   │ │
│ │                                                           │ │
│ │ ↑ ALL MEMBERS SHOWN (not just top 3)                    │ │
│ │ ↑ Sorted by: Bird count (desc), then Name (asc)         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Key Features Illustrated

### 1. Month Selector Dropdown
```
┌─────────────────────────────────────┐
│ Select Month                         │
│ ┌─────────────────────────────────┐ │
│ │ February              ▼         │ │  ← Current selection
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

When clicked:
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │ February              ▲         │ │
│ ├─────────────────────────────────┤ │
│ │ February (selected)              │ │  ← Current month (default)
│ │ January                          │ │
│ │ December                         │ │
│ │ November                         │ │
│ │ ...                              │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 2. Full Member List (Not Just Top 3)
```
BEFORE (Old Implementation):
┌─────────────────────────────────────┐
│ Top Birdwatchers (February)         │
│ ┌─────────────────────────────────┐ │
│ │ 🥇  Alice         5 spp         │ │
│ │ 🥈  Bob           4 spp         │ │
│ │ 🥉  Charlie       4 spp         │ │
│ └─────────────────────────────────┘ │
│ (David and Eve not shown)           │
└─────────────────────────────────────┘

AFTER (New Implementation):
┌─────────────────────────────────────┐
│ Top Birdwatchers (February)         │
│ ┌─────────────────────────────────┐ │
│ │ 🥇  Alice         5 spp         │ │
│ │ 🥈  Bob           4 spp         │ │
│ │ 🥈  Charlie       4 spp         │ │  ← Tied, alphabetical
│ │ #4  David         2 spp         │ │  ← Now visible!
│ │ #5  Eve           1 spp         │ │  ← Now visible!
│ └─────────────────────────────────┘ │
│ (All members shown)                 │
└─────────────────────────────────────┘
```

### 3. Sorting Logic with Ties
```
Primary Sort: Bird Count (Descending)
Secondary Sort: User Name (Alphabetical)

Example with ties:
Bob Brown:     4 birds  }
Charlie Chen:  4 birds  } ← Same count
                           Sorted alphabetically:
                           Bob < Charlie

Result:
🥈 Bob Brown      4 spp
🥈 Charlie Chen   4 spp

Both get rank #2 (same emoji), but Bob appears first.
```

### 4. Empty State Handling
```
┌─────────────────────────────────────────┐
│ Select Month                             │
│ ┌─────────────────────────────────────┐ │
│ │ January               ▼             │ │  ← Month with no data
│ └─────────────────────────────────────┘ │
│                                          │
│ Top Birdwatchers (January)              │
│ ┌─────────────────────────────────────┐ │
│ │                                      │ │
│ │   No sightings recorded for this    │ │
│ │   month                              │ │
│ │                                      │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Interaction Flow

1. **User lands on Group Stats tab**
   - Month selector defaults to current month
   - Shows all members with current month data

2. **User clicks month selector dropdown**
   - Dropdown opens showing available months (current year)
   - Months listed from newest to oldest

3. **User selects different month**
   - List updates to show all members for that month
   - Sorting maintained (count desc, name asc)
   - Empty state shown if no data

4. **User can click any member**
   - Navigates to member detail view
   - Shows individual statistics

## Responsive Design

### Desktop View
```
┌──────────────────────────────────────────────────┐
│ [Wide month selector]                            │
│ [Member list with photos]                        │
└──────────────────────────────────────────────────┘
```

### Mobile View
```
┌────────────────────┐
│ [Full-width]       │
│ [selector]         │
│                    │
│ [Stacked]          │
│ [member]           │
│ [items]            │
└────────────────────┘
```

## Styling Details

### Month Selector
- Background: `var(--bg-tertiary)`
- Border: `1px solid var(--border-color)`
- Border radius: `8px`
- Padding: `1rem`
- Hover: Border color changes to `var(--accent-primary)`

### Member Items
- Background: `var(--bg-tertiary)`
- Display: Flex layout with avatar, name, and stats
- Gap: `0.75rem` between items
- Hover: Slight translation and accent border

## Test Data Scenarios

The seed script creates these scenarios for testing:

| User | Current Month | Previous Month | Purpose |
|------|--------------|----------------|---------|
| Alice | 5 birds | 2 birds | Highest scorer |
| Bob | 4 birds | 4 birds | Tied for 2nd |
| Charlie | 4 birds | 1 bird | Tied for 2nd, alphabetically after Bob |
| David | 2 birds | 3 birds | Mid-range scorer |
| Eve | 1 bird | 0 birds | Low scorer, tests empty state |

This demonstrates:
- Different counts for ranking
- Tied scores with alphabetical sorting
- Empty states (Eve in previous month)
- Month-to-month variation
