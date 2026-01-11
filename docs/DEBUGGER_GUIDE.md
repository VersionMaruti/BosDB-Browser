# BosDB Debugger Guide

## Overview

The BosDB Debugger allows you to step through SQL queries statement-by-statement, inspect variables, and understand query execution flow. It's perfect for:

- **Learning**: Understand how complex queries execute
- **Debugging**: Find issues in multi-statement queries
- **Testing**: Verify query logic before deployment
- **Performance Analysis**: See which statements are slow

## How to Use the Debugger

### 1. Setting Breakpoints

Breakpoints pause query execution at specific lines. To set a breakpoint:

1. Open the Query Editor
2. Click the gutter (left margin) next to a line number
3. A red dot appears indicating a breakpoint
4. Click again to remove the breakpoint

**Example:**
```sql
-- Click line 2 to set breakpoint
SELECT * FROM users WHERE id = 1;
SELECT * FROM orders WHERE user_id = 1; -- BREAKPOINT HERE
SELECT * FROM products WHERE id IN (SELECT product_id FROM orders);
```

### 2. Starting a Debug Session

**Method 1: Debug Button**
1. Write your multi-statement query
2. Set breakpoints where you want to pause
3. Click the "Debug" button (bug icon) instead of "Run"
4. The debugger panel appears at the bottom

**Method 2: Keyboard Shortcut**
- Press `F5` to start debugging
- Press `F9` to toggle breakpoint on current line

### 3. Debug Controls

Once debugging starts, use these controls:

| Button | Shortcut | Action |
|--------|----------|--------|
| ▶️ **Continue** | `F5` | Run until next breakpoint or end |
| ⏸️ **Pause** | `F6` | Pause execution immediately |
| ⏭️ **Step** | `F10` | Execute one statement and pause |
| ⏮️ **Step Back** | `Shift+F10` | Go back one statement (experimental) |
| ⏹️ **Stop** | `Shift+F5` | Stop debugging session |

### 4. Inspecting Variables

While paused, the debugger shows:

**Current Line**: Highlighted in yellow
```sql
SELECT * FROMUsers WHERE id = 1;  ← Currently executing
```

**Variables Panel**: Shows query results and metadata
- `@last_insert_id`: Last inserted row ID
- `@rows_affected`: Number of rows changed
- `@result`: Current query result set

**Example:**
```sql
INSERT INTO users (name) VALUES ('Alice'); 
-- After this line executes:
-- @last_insert_id = 42
-- @rows_affected = 1

SELECT * FROM users WHERE id = @last_insert_id;
-- @result = [{id: 42, name: 'Alice'}]
```

### 5. Step-by-Step Execution

**Scenario**: Debugging a transaction

```sql
BEGIN TRANSACTION;                          -- Statement 1
    INSERT INTO logs (message) VALUES ('Starting'); -- Statement 2 (BREAKPOINT)
    UPDATE counters SET value = value + 1;  -- Statement 3
    SELECT value FROM counters;              -- Statement 4 (BREAKPOINT)
COMMIT;                                      -- Statement 5
```

**Debug Flow:**
1. Click "Debug" - Pauses before Statement 1
2. Click "Step" - Executes Statement 1 (BEGIN)
3. Click "Continue" - Runs to breakpoint (Statement 2)
4. Click "Step" - Executes INSERT, shows `@rows_affected = 1`
5. Click "Step" - executes UPDATE
6. Click "Continue" - Runs to breakpoint (Statement 4)
7. Inspect `@result` to see counter value
8. Click "Continue" - Finishes (COMMIT)

## Advanced Features

### Conditional Breakpoints

Right-click a breakpoint to set a condition:

```sql
SELECT * FROM orders WHERE user_id = ?;  -- Break if user_id = 5
```

### Watch Expressions

Add expressions to watch their values:
- `COUNT(*)` - Monitor row counts
- `@@ROWCOUNT` - SQL Server row count
- `LAST_INSERT_ID()` - MySQL last ID

### Call Stack (for Stored Procedures)

When debugging procedures, see the call stack:
```
Main Query
└─> sp_process_order(order_id=123)
    └─> sp_update_inventory(product_id=456)
```

## Example Debugging Sessions

### Example 1: Simple Multi-Statement

```sql
-- Goal: Verify data insertion and retrieval

CREATE TABLE temp_test (id INT, value VARCHAR(50));  -- Line 1
INSERT INTO temp_test VALUES (1, 'Test');            -- Line 2 (BREAKPOINT)
SELECT * FROM temp_test;                             -- Line 3 (BREAKPOINT)
DROP TABLE temp_test;                                -- Line 4
```

**Steps:**
1. Set breakpoints on lines 2 and 3
2. Click "Debug"
3. At line 2: Click "Step", verify `@rows_affected = 1`
4. At line 3: Click "Step", inspect `@result` shows our test row
5. Click "Continue" to finish

### Example 2: Transaction Rollback

```sql
BEGIN;                                               -- Line 1
    UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- Line 2 (BREAKPOINT)
    SELECT balance FROM accounts WHERE id = 1;       -- Line 3 (BREAKPOINT)
    -- Check if balance is negative
    UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- Line 4
COMMIT;                                              -- Line 5
```

**Steps:**
1. Set breakpoints on lines 2 and 3
2. Debug and step through
3. At line 3, check balance in `@result`
4. If negative, click "Stop" to rollback
5. Otherwise, "Continue" to commit

### Example 3: Complex Query Analysis

```sql
-- Analyze slow query step by step

WITH recent_orders AS (                              -- Line 1
    SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '7 days'  -- Line 2
),                                                   -- Line 3 (BREAKPOINT)
order_totals AS (                                    -- Line 4
    SELECT user_id, SUM(total) as total_spent        -- Line 5
    FROM recent_orders                               -- Line 6
    GROUP BY user_id                                 -- Line 7
)                                                    -- Line 8 (BREAKPOINT)
SELECT u.name, ot.total_spent                        -- Line 9
FROM users u                                         -- Line 10
JOIN order_totals ot ON u.id = ot.user_id           -- Line 11
ORDER BY ot.total_spent DESC                         -- Line 12
LIMIT 10;                                            -- Line 13
```

**Steps:**
1. Set breakpoints at CTEs (lines 3, 8)
2. Step through to see intermediate results
3. Check row counts at each CTE
4. Identify which part is slow

## Troubleshooting

### Debugger Won't Start

**Issue**: "Failed to start debug session"

**Solutions:**
- Ensure connection is active
- Check query syntax (must be valid SQL)
- Verify at least one statement exists
- Try refreshing the page

### Breakpoints Ignored

**Issue**: Debugger doesn't pause at breakpoints

**Solutions:**
- Breakpoints must be on lines with SQL statements
- Empty lines and comments don't trigger breakpoints
- Ensure breakpoint icon (red dot) is visible

### Variables Not Showing

**Issue**: Variable panel is empty

**Solutions:**
- Execute at least one statement first
- Some statement types don't produce variables (DDL)
- Check browser console for errors

## Keyboard Shortcuts Reference

| Action | Shortcut |
|--------|----------|
| Start/Continue Debug | `F5` |
| Pause | `F6` |
| Step Over | `F10` |
| Step Back | `Shift+F10` |
| Stop Debugging | `Shift+F5` |
| Toggle Breakpoint | `F9` |
| Remove All Breakpoints | `Ctrl+Shift+F9` |

## Tips & Best Practices

1. **Start Small**: Debug simple queries first to learn the controls
2. **Use Breakpoints Wisely**: Set them only where you need to inspect
3. **Check Variables**: Always verify `@rows_affected` for DML statements
4. **Transactions**: Be careful with transactions - stop debugging to rollback
5. **Performance**: Debugging adds overhead - don't use in production
6. **Save Sessions**: You can save debug sessions for later replay

## Need Help?

- **Documentation**: Check [QUERY EDITOR_GUIDE.md](./QUERY_EDITOR.md)
- **Examples**: See `examples/debugging` folder
- **Support**: Open an issue on GitHub

---

**Happy Debugging!** 🐛🔍
