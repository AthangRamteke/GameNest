# tic_tac_toe_minimax.py
# Run: python tic_tac_toe_minimax.py
# Controls: when prompted, enter a move as 0-8 (board indices)
# Board indices:
# 0 | 1 | 2
# 3 | 4 | 5
# 6 | 7 | 8

import math
import random

EMPTY = " "
PLAYER_X = "X"   # we'll let the AI default to X (maximizer)
PLAYER_O = "O"   # human can be O or X depending on choice

def new_board():
    return [EMPTY] * 9

def print_board(b):
    rows = [
        f" {b[0]} | {b[1]} | {b[2]} ",
        f" {b[3]} | {b[4]} | {b[5]} ",
        f" {b[6]} | {b[7]} | {b[8]} ",
    ]
    sep = "\n---+---+---\n"
    print("\n" + sep.join(rows) + "\n")

WIN_LINES = [
    (0,1,2), (3,4,5), (6,7,8),  # rows
    (0,3,6), (1,4,7), (2,5,8),  # cols
    (0,4,8), (2,4,6)            # diagonals
]

def winner(board):
    """Return 'X' or 'O' if someone won, or None otherwise."""
    for a,b,c in WIN_LINES:
        if board[a] == board[b] == board[c] != EMPTY:
            return board[a]
    return None

def is_full(board):
    return all(s != EMPTY for s in board)

def terminal_state(board):
    w = winner(board)
    if w:
        return True, w
    if is_full(board):
        return True, None
    return False, None

def available_moves(board):
    return [i for i, v in enumerate(board) if v == EMPTY]

def score_for_terminal(board, ai_player):
    t, w = terminal_state(board)
    if not t:
        raise ValueError("board is not terminal")
    if w is None:
        return 0  # draw
    return 1 if w == ai_player else -1

def minimax(board, depth, maximizing_player, ai_player, alpha=-math.inf, beta=math.inf):
    """Minimax with alpha-beta pruning.
    Returns: (best_score, best_move)
    """
    term, winner_player = terminal_state(board)
    if term:
        sc = score_for_terminal(board, ai_player)
        return sc, None

    if maximizing_player:
        best_score = -math.inf
        best_move = None
        for mv in available_moves(board):
            board[mv] = ai_player
            score, _ = minimax(board, depth+1, False, ai_player, alpha, beta)
            board[mv] = EMPTY
            if score > best_score:
                best_score = score
                best_move = mv
            alpha = max(alpha, best_score)
            if beta <= alpha:
                break
        return best_score, best_move
    else:
        # minimizing: opponent tries to minimize ai_player's score
        opp = PLAYER_O if ai_player == PLAYER_X else PLAYER_X
        best_score = math.inf
        best_move = None
        for mv in available_moves(board):
            board[mv] = opp
            score, _ = minimax(board, depth+1, True, ai_player, alpha, beta)
            board[mv] = EMPTY
            if score < best_score:
                best_score = score
                best_move = mv
            beta = min(beta, best_score)
            if beta <= alpha:
                break
        return best_score, best_move

def ai_move(board, ai_player):
    """Return index (0-8) of AI's chosen move."""
    _, move = minimax(board, 0, True, ai_player)
    # If minimax returns None (shouldn't for non-terminal), pick a random available:
    if move is None:
        moves = available_moves(board)
        return random.choice(moves) if moves else None
    return move

def human_move(board):
    moves = available_moves(board)
    while True:
        try:
            raw = input(f"Your move (0-8). Available: {moves} >>> ").strip()
            mv = int(raw)
            if mv in moves:
                return mv
            print("Invalid move index or not available.")
        except Exception:
            print("Enter an integer 0-8 corresponding to an empty cell.")

def play_game(human_is_x=False, ai_plays_first=False):
    board = new_board()
    ai_player = PLAYER_X if not human_is_x else PLAYER_O
    human_player = PLAYER_O if not human_is_x else PLAYER_X

    current = PLAYER_X if ai_plays_first else PLAYER_X  # X always starts in rules
    # If ai_plays_first False but human_is_x True then human starts as X.
    if human_is_x:
        current = PLAYER_X  # human X starts
    else:
        current = PLAYER_X  # AI X starts unless human_is_x True

    print(f"AI is '{ai_player}'. You are '{human_player}'. X always starts.")
    print_board(board)

    while True:
        term, w = terminal_state(board)
        if term:
            if w:
                print(f"Winner: {w}")
            else:
                print("It's a draw.")
            print_board(board)
            break

        # whose turn?
        xs = board.count(PLAYER_X)
        os = board.count(PLAYER_O)
        turn = PLAYER_X if xs == os else PLAYER_O

        if turn == ai_player:
            mv = ai_move(board, ai_player)
            board[mv] = ai_player
            print(f"AI ({ai_player}) plays {mv}")
            print_board(board)
        else:
            mv = human_move(board)
            board[mv] = human_player
            print_board(board)

def ai_vs_ai(randomize=False):
    board = new_board()
    current = PLAYER_X
    while True:
        term, w = terminal_state(board)
        if term:
            if w:
                print("Winner:", w)
            else:
                print("Draw.")
            print_board(board)
            break
        if current == PLAYER_X:
            mv = ai_move(board, PLAYER_X) if not randomize else random.choice(available_moves(board))
            board[mv] = PLAYER_X
            current = PLAYER_O
        else:
            mv = ai_move(board, PLAYER_O) if not randomize else random.choice(available_moves(board))
            board[mv] = PLAYER_O
            current = PLAYER_X
        print_board(board)

if __name__ == "__main__":
    print("Tic-Tac-Toe with Minimax (alpha-beta).")
    mode = ""
    while mode not in ("1","2"):
        mode = input("Choose: 1) Play vs AI  2) AI vs AI >>> ").strip()
    if mode == "1":
        # Let user choose which side
        side = ""
        while side not in ("X","O"):
            side = input("Which side do you want? X (first) or O (second)? >>> ").strip().upper()
        human_is_x = (side == "X")
        # If human chooses O, AI is X and starts first
        play_game(human_is_x=human_is_x, ai_plays_first=(not human_is_x))
    else:
        print("AI vs AI:")
        ai_vs_ai()