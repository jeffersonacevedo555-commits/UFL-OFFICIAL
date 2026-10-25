-- Permite cerrar propuestas y aceptar traspasos sin alterar temporadas anteriores.
ALTER TABLE "market_proposals" DROP CONSTRAINT "market_proposal_status";
ALTER TABLE "market_proposals" ADD CONSTRAINT "market_proposal_status" CHECK ("status" IN ('pending', 'withdrawn', 'accepted', 'rejected'));
