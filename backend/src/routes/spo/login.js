const express = require('express');
const router = express.Router();

const { executeQuery} = require('../../db/bigquery');
const bcrypt = require('bcryptjs');

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const cleanEmail = String(email || "").trim();

    const result = await executeQuery(
    {
        sql: `
        SELECT 
            USERNAME, EMAIL, USER_PASSWORD, ROLE,
            IS_ACTIVE, PASSWORD_NOT_YET_CHANGED
        FROM SPO_USERS
        WHERE LOWER(EMAIL) = LOWER(?)
        `,
        binds: [cleanEmail],
    },
    "SPO"
    );

    if (result.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    const dbUser = result[0];

    if (!dbUser.IS_ACTIVE) {
      return res.status(403).json({
        success: false,
        message: "User disabled"
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      dbUser.USER_PASSWORD
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }

    return res.json({
      success: true,
      username: dbUser.USERNAME,
      role: dbUser.ROLE,
      passwordNotYetChanged: dbUser.PASSWORD_NOT_YET_CHANGED === true
    });

  } catch (err) {
    console.error("SPO Login error:", err?.message || err);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

router.post("/check-first-password-reset", async (req, res) => {
  const { email } = req.body;

  try {
    const cleanEmail = String(email || "").trim();

    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const result = await executeQuery(
      {sql:`
      SELECT EMAIL, PASSWORD_NOT_YET_CHANGED, IS_ACTIVE
      FROM SPO_USERS
      WHERE LOWER(EMAIL) = LOWER(?)
      `,
      binds:[cleanEmail]},
      "SPO"
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const dbUser = result[0];

    if (!dbUser.IS_ACTIVE) {
      return res.status(403).json({
        success: false,
        message: "User disabled"
      });
    }

    if (dbUser.PASSWORD_NOT_YET_CHANGED !== true) {
      return res.status(400).json({
        success: false,
        message: "This user has already set a password."
      });
    }

    return res.json({
      success: true,
      message: "User can set first password."
    });

  } catch (err) {
    console.error("SPO check first password reset error:", err?.message || err);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

router.post("/change-first-password", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const cleanEmail = String(email || "").trim();
    const cleanPassword = String(newPassword || "");

    if (!cleanEmail || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and new password are required"
      });
    }

    if (cleanPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long"
      });
    }

    const result = await executeQuery(
      {sql:`
      SELECT EMAIL, PASSWORD_NOT_YET_CHANGED, IS_ACTIVE
      FROM SPO_USERS
      WHERE LOWER(EMAIL) = LOWER(?)
      `,
      binds:[cleanEmail]},
      'SPO'
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const dbUser = result[0];

    if (!dbUser.IS_ACTIVE) {
      return res.status(403).json({
        success: false,
        message: "User disabled"
      });
    }

    if (dbUser.PASSWORD_NOT_YET_CHANGED !== true) {
      return res.status(400).json({
        success: false,
        message: "This user has already set a password."
      });
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    await executeQuery(
      {sql:`
      UPDATE SPO_USERS
      SET USER_PASSWORD = ?,
          PASSWORD_NOT_YET_CHANGED = FALSE
      WHERE LOWER(EMAIL) = LOWER(?)
      `,
      binds:[hashedPassword, cleanEmail]},
      'SPO'
    );

    return res.json({
      success: true,
      message: "Password successfully updated"
    });

  } catch (err) {
    console.error("SPO first password change error:", err?.message || err);

    return res.status(500).json({
      success: false,
      message: "Failed to update password"
    });
  }
});


module.exports = router;