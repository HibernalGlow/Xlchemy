from pathlib import Path
import logging
import random
import os

from data.constants import ALLOWED_INPUT

class Items():
    def __init__(self):
        self.items = []
        self.item_count = 0
        self.completed_item_count = 0

    def parseData(self, order: str = "Original", *items) -> None:
        """Populate the structure with proper data."""
        logging.info(f"[Items.parseData] Called with order={order}, items count={len(items)}")
        for abs_path, anchor_path in items:
            abs_path = Path(abs_path)
            ext = abs_path.suffix[1:]
    
            if ext.lower() not in ALLOWED_INPUT:
                logging.error(f"[Items] Extension not allowed ({ext})")
                continue

            if not isinstance(anchor_path, Path):
                logging.error(f"[Items] anchor_path is not a Path object ({type(anchor_path)})")
                continue

            self.items.append(
                (
                    abs_path,
                    anchor_path,
                )
            )
        
        self.item_count = len(self.items)
        logging.info(f"[Items.parseData] Parsed {self.item_count} items")

        match order:
            case "Random":
                random.shuffle(self.items)
            case "Sequential":
                self.items.sort(key=lambda pair: (str(pair[0].parent).casefold(), pair[0].name.casefold()))
            case "Path Ascending":
                self.items.sort(key=lambda pair: str(pair[0]).casefold())
            case "Path Descending":
                self.items.sort(key=lambda pair: str(pair[0]).casefold(), reverse=True)
            case "Size Ascending":
                self.items.sort(key=lambda pair: os.path.getsize(pair[0]) if pair[0].is_file() else 0)
            case "Size Descending":
                self.items.sort(key=lambda pair: os.path.getsize(pair[0]) if pair[0].is_file() else 0, reverse=True)

    def getItem(self, n) -> Path:
        return self.items[n]

    def getItemCount(self) -> int:
        return self.item_count

    def getCompletedItemCount(self) -> int:
        return self.completed_item_count
    
    def addCompletedItem(self):
        self.completed_item_count += 1

    def clear(self):
        self.items = []
        self.completed_item_count = 0
        self.item_count = 0
