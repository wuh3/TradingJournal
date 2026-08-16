#!/usr/bin/env python3
"""
Generate a bcrypt hash for the single-user login password.

Usage:
    python backend/scripts/hash_password.py "your-password-here"

Paste the printed hash into APP_PASSWORD_HASH in your .env file.
"""

import sys

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python hash_password.py <password>")
        sys.exit(1)

    print(pwd_context.hash(sys.argv[1]))


if __name__ == "__main__":
    main()
