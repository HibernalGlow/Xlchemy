from PySide6.QtWidgets import QWidget, QHBoxLayout, QLabel, QPushButton
from PySide6.QtCore import Signal
from PySide6.QtWidgets import QInputDialog

from data.preset_manager import PresetManager
from ui.lib.utils import createQHBoxLayout, blockSignals
from ui.widgets import ComboBox
from ui.dialogs import message_box


class PresetWidget(QWidget):
    preset_applied = Signal(dict)

    def __init__(self, get_all_settings=None, parent=None):
        super().__init__(parent)
        self.preset_manager = PresetManager()
        self._get_all_settings = get_all_settings

        self.preset_cmb = ComboBox()
        self.preset_cmb.setMinimumWidth(150)
        self.preset_save_btn = QPushButton("Save")
        self.preset_delete_btn = QPushButton("Delete")
        self.preset_default_btn = QPushButton("Set Default")

        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(QLabel("Preset"))
        layout.addWidget(self.preset_cmb)
        layout.addWidget(self.preset_save_btn)
        layout.addWidget(self.preset_delete_btn)
        layout.addWidget(self.preset_default_btn)
        layout.addStretch()

        self.preset_cmb.currentIndexChanged.connect(self._onPresetChanged)
        self.preset_save_btn.clicked.connect(self._onPresetSave)
        self.preset_delete_btn.clicked.connect(self._onPresetDelete)
        self.preset_default_btn.clicked.connect(self._onPresetSetDefault)

        self._refreshPresetList()

    def _refreshPresetList(self):
        with blockSignals(self.preset_cmb):
            self.preset_cmb.clear()
            self.preset_cmb.addItem("--")
            default_name = self.preset_manager.getDefault()
            for name in self.preset_manager.listPresets():
                display = f"{name} ★" if name == default_name else name
                self.preset_cmb.addItem(display, name)

    def _onPresetChanged(self):
        name = self.preset_cmb.currentData()
        if not name:
            return
        data = self.preset_manager.load(name)
        if data is None:
            return
        self.preset_applied.emit(data)

    def _onPresetSave(self):
        name = self.preset_cmb.currentData()
        if not name:
            name, ok = QInputDialog.getText(self, "Save Preset", "Preset name:")
            if not ok or not name.strip():
                return
            name = name.strip()
        else:
            ok = message_box.confirm(self, "Save Preset", f"Overwrite preset \"{name}\"?")
            if not ok:
                return
        data = {}
        if self._get_all_settings:
            data = self._get_all_settings()
        if self.preset_manager.save(name, data):
            self._refreshPresetList()
            for i in range(self.preset_cmb.count()):
                if self.preset_cmb.itemData(i) == name:
                    self.preset_cmb.setCurrentIndex(i)
                    break

    def _onPresetDelete(self):
        name = self.preset_cmb.currentData()
        if not name:
            return
        ok = message_box.confirm(self, "Delete Preset", f"Delete preset \"{name}\"?")
        if not ok:
            return
        if self.preset_manager.delete(name):
            self._refreshPresetList()
            self.preset_cmb.setCurrentIndex(0)

    def _onPresetSetDefault(self):
        name = self.preset_cmb.currentData()
        if not name:
            return
        current_default = self.preset_manager.getDefault()
        if current_default == name:
            self.preset_manager.setDefault(None)
        else:
            self.preset_manager.setDefault(name)
        self._refreshPresetList()
        for i in range(self.preset_cmb.count()):
            if self.preset_cmb.itemData(i) == name:
                self.preset_cmb.setCurrentIndex(i)
                break

    def loadDefaultPreset(self):
        name = self.preset_manager.getDefault()
        if not name:
            return
        data = self.preset_manager.load(name)
        if data is None:
            return
        self.preset_applied.emit(data)
        for i in range(self.preset_cmb.count()):
            if self.preset_cmb.itemData(i) == name:
                with blockSignals(self.preset_cmb):
                    self.preset_cmb.setCurrentIndex(i)
                break
