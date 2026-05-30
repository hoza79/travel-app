import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#061237",
  },

  scrollView: {
    flex: 1,
    width: "100%",
  },

  scrollContent: {
    paddingTop: 15,
  },

  headerContainer: {
    marginBottom: 10,
  },

  searchRow: {
    width: "90%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
  },

  searchBar: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    paddingHorizontal: 15,
    backgroundColor: "#030d2c",
    color: "white",
    fontSize: 16,
  },

  filterButton: {
    width: 40,
    height: 40,
    marginLeft: 10,
    borderRadius: 14,
    backgroundColor: "#030d2c",
    alignItems: "center",
    justifyContent: "center",
  },

  filterIcon: {
    width: 22,
    height: 22,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  filterModal: {
    width: "100%",
    borderRadius: 8,
    backgroundColor: "#061237",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 20,
  },

  modalTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 18,
  },

  fieldLabel: {
    color: "#d8e0f0",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
  },

  filterInput: {
    height: 44,
    borderRadius: 8,
    backgroundColor: "#030d2c",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "white",
    fontSize: 15,
    paddingHorizontal: 12,
    marginBottom: 16,
  },

  locationField: {
    position: "relative",
    zIndex: 3,
  },

  locationFieldSecond: {
    position: "relative",
    zIndex: 2,
  },

  suggestionList: {
    position: "absolute",
    top: 68,
    left: 0,
    right: 0,
    borderRadius: 8,
    backgroundColor: "#030d2c",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    zIndex: 20,
    elevation: 10,
    overflow: "hidden",
  },

  suggestionItem: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  suggestionText: {
    color: "#d8e0f0",
    fontSize: 14,
    lineHeight: 19,
  },

  radiusRow: {
    flexDirection: "row",
    gap: 12,
  },

  radiusField: {
    flex: 1,
  },

  distanceInputRow: {
    height: 44,
    borderRadius: 8,
    backgroundColor: "#030d2c",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  distanceInput: {
    flex: 1,
    color: "white",
    fontSize: 15,
    paddingVertical: 0,
  },

  distanceUnit: {
    color: "#9bb0d4",
    fontSize: 14,
    marginLeft: 6,
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
    gap: 10,
  },

  modalCloseButton: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCloseButtonText: {
    color: "#d8e0f0",
    fontSize: 15,
    fontWeight: "600",
  },

  applyButton: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#256DFF",
    justifyContent: "center",
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.45,
  },

  applyButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
});
