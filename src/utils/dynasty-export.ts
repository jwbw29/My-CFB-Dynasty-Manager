// src/utils/dynasty-export.ts

export interface DynastySnapshot {
  version: string;
  exportedAt: string;
  dynastyData: Record<string, any>;
}

export interface AllDynastiesBundleSnapshot {
  kind: "all-dynasties-bundle";
  version: "1.0.0";
  exportedAt: string;
  dynasties: ReadonlyArray<Record<string, unknown>>;
  snapshots: Record<string, Record<string, unknown>>;
}

export class DynastyExporter {
  /**
   * Narrows unknown JSON values to plain object records before we treat them as snapshots.
   *
   * We avoid serializing primitives/arrays as dynasty blobs because import expects key/value
   * objects that mirror localStorage's `dynasty_<id>` structure.
   */
  private static isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private static parseJsonOrThrow(raw: string, errorMessage: string): unknown {
    try {
      return JSON.parse(raw) as unknown;
    } catch (error) {
      console.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Exports the active dynasty from its canonical per-dynasty blob.
   *
   * We intentionally read `dynasty_<id>` as a single source of truth rather than rebuilding
   * an export from a separate key list. That prevents export drift when saved categories evolve
   * in DynastyContext and keeps backup behavior aligned with the real persisted snapshot.
   *
   * @returns A formatted JSON snapshot payload suitable for backup/download.
   * @throws {Error} When no active dynasty is selected.
   * @throws {Error} When the active dynasty has not been manually saved yet.
   */
  public static exportCurrentDynasty(): string {
    const currentDynastyId = localStorage.getItem('currentDynastyId');
    if (!currentDynastyId) {
      throw new Error('No active dynasty to export.');
    }

    // Read the canonical saved blob to avoid key-list drift and preserve every category already persisted.
    const raw = localStorage.getItem(`dynasty_${currentDynastyId}`);
    if (!raw) {
      throw new Error('No saved data found for the active dynasty - use Manual Save first.');
    }

    const parsedDynastyData = this.parseJsonOrThrow(
      raw,
      "Active dynasty data is corrupted and could not be exported."
    );
    if (!this.isObjectRecord(parsedDynastyData)) {
      throw new Error("Active dynasty data is malformed and could not be exported.");
    }

    const snapshot: DynastySnapshot = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      dynastyData: parsedDynastyData,
    };

    return JSON.stringify(snapshot, null, 2);
  }

  public static downloadDynastyBackup(): void {
    try {
      const data = this.exportCurrentDynasty();
      const snapshot = JSON.parse(data) as DynastySnapshot;
      const schoolName = snapshot.dynastyData.coachProfile?.schoolName || 'Dynasty';
      const currentYear = snapshot.dynastyData.currentYear || new Date().getFullYear();
      
      const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${schoolName}-Dynasty-${currentYear}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading dynasty backup:', error);
      throw error;
    }
  }

  /**
   * Exports a bundle containing every dynasty metadata row plus each dynasty's canonical blob.
   *
   * The `dynasties` array is copied exactly as stored so imports can preserve launch metadata,
   * while each `dynasty_<id>` blob is loaded independently to avoid failing the whole backup when
   * one saved dynasty entry is missing or corrupted.
   *
   * @returns A formatted JSON bundle for all dynasties in localStorage.
   * @throws {Error} When no dynasty metadata list exists or the list is empty.
   */
  public static exportAllDynasties(): string {
    const dynastiesRaw = localStorage.getItem("dynasties");
    if (!dynastiesRaw) {
      throw new Error("No dynasties found to export.");
    }

    const parsedDynasties = this.parseJsonOrThrow(
      dynastiesRaw,
      "Dynasty list is corrupted and could not be exported."
    );
    if (!Array.isArray(parsedDynasties) || parsedDynasties.length === 0) {
      throw new Error("No dynasties found to export.");
    }

    const snapshots: Record<string, Record<string, unknown>> = {};

    parsedDynasties.forEach((entry, index) => {
      if (!this.isObjectRecord(entry) || typeof entry.id !== "string") {
        console.warn(
          `Skipping dynasty metadata entry at index ${index}: missing a valid id field.`
        );
        return;
      }

      const rawSnapshot = localStorage.getItem(`dynasty_${entry.id}`);
      if (!rawSnapshot) {
        console.warn(`Skipping dynasty ${entry.id}: localStorage key dynasty_${entry.id} is missing.`);
        return;
      }

      try {
        const parsedSnapshot = JSON.parse(rawSnapshot) as unknown;
        if (!this.isObjectRecord(parsedSnapshot)) {
          console.warn(`Skipping dynasty ${entry.id}: snapshot is not a valid object payload.`);
          return;
        }
        snapshots[entry.id] = parsedSnapshot;
      } catch (error) {
        console.warn(`Skipping dynasty ${entry.id}: snapshot JSON is corrupted.`, error);
      }
    });

    const bundle: AllDynastiesBundleSnapshot = {
      kind: "all-dynasties-bundle",
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      dynasties: parsedDynasties as ReadonlyArray<Record<string, unknown>>,
      snapshots,
    };

    return JSON.stringify(bundle, null, 2);
  }

  /**
   * Downloads a full-account backup containing every dynasty bundle export.
   *
   * This mirrors the single-dynasty download flow so browser behavior stays consistent
   * for users who already trust the current backup interaction pattern.
   */
  public static downloadAllDynastiesBackup(): void {
    try {
      const data = this.exportAllDynasties();
      const blob = new Blob([data], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `All-Dynasties-Backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading all dynasties backup:", error);
      throw error;
    }
  }
}
