package ro.bid4.backend.catalog.api.dto;

/**
 * Where the signed-in viewer stands on this auction.
 *
 * <p>Absent entirely for an anonymous caller: NONE means "you have not bid", which is a different
 * statement from "there is nobody to have bid".
 */
public enum ViewerBidStatus {
  WINNING,
  OUTBID,
  NONE
}
