-- ============================================================
-- Migration 006 : Workflow verification revendication
-- ============================================================

ALTER TABLE centres_auditifs ADD COLUMN claim_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE centres_auditifs ADD CONSTRAINT centres_claim_status_check
  CHECK (claim_status IN ('none', 'pending', 'approved', 'rejected'));
CREATE INDEX idx_centres_claim_status ON centres_auditifs(claim_status);
