package ro.bid4.backend.cause.domain;

/**
 * Mirrors BeneficiaryType in frontend/src/lib/types/cause.ts.
 *
 * <p>A cause may be raised for a private person, which is why identity sits at the centre of this
 * model: an NGO can be checked against a register and a person cannot.
 */
public enum BeneficiaryType {
  INDIVIDUAL,
  MINOR,
  NGO
}
