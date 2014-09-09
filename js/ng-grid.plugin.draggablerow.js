/**
 *
 * Draggable Row plugin for ng-grid 2.0.8
 * by @junkoro
 *
 */
function ngGridDraggableRow(initialSortField) {


  /**
   * private variables
   */
  var self = this;
  var $scope = null;
  var grid = null;
  var services = null;
  var rowsSrc = [];
  var rowItems = [];
  var rowItemsMove = [];


  /**
   * public variables
   */
  self.initialSortField = initialSortField;


  /**
   * Initialize
   */
  self.init = function(_scope, _grid, _services) {
    $scope = _scope;
    grid = _grid;
    services = _services;
    assignEvents();
  };


  /**
   * Assign event handlers
   */
  function assignEvents() {
    var vp = grid.$viewport;
    vp.on("mousedown", onRowMouseDown);
    vp.on("dragover", dragOver);
    vp.on("drop", onRowDrop);
  }


  /**
   * Extract the target rowItem from the event.
   * rowItem has rowIndex, selected, element, etc...
   */
  function getTargetRowItemFromEvent(event) {
    var elm = $(event.target).closest(".ngRow");
    var scope = angular.element(elm).scope();
    if (scope && scope.row) {
      return scope.row.orig;
    }
    return null;
  }


  /**
   * Returns selected rowItems.
   * rowItems has rowIndex, selected, element, etc...
   */
  function getSelectedRowItems() {
    var rows = [];
    for (var i = 0; i < rowItems.length; i++) {
      var rowItem = rowItems[i];
      if (rowItem.selected) {
        rows.push(rowItem);
      }
    }
    return rows;
  }


  /**
   * Mousedown event handler
   */
  function onRowMouseDown(event) {

    // Get clicked rowItem from event.
    var rowItemClicked = getTargetRowItemFromEvent(event);
    if (!rowItemClicked) {
      //console.log("onRowMouseDown() Clicked object is not row.");
      return;
    }

    // Update rowSrc & rowCache
    rowsSrc = $scope[grid.config.data];
    rowItems = grid.rowCache;

    // Get seleted rowItems as rows to move.
    rowItemsMove = getSelectedRowItems();

    // If no rows to move, return.
    if (rowItemsMove.length === 0) {
      //console.log("onRowMouseDown() No rows to move.");
      return;
    }

    // Do nothing when the clicked row is not selected.
    if (rowItemsMove.indexOf(rowItemClicked) === -1) {
      //console.log("onRowMouseDown() Do nothing. The clicked row is not selected.");
      return;
    }

    // Add dragOver and dragLeave behavior to all ngRows.
    var ngRows = $(".ngCanvas .ngRow");
    ngRows.on("dragenter", function(evt) {
      //console.log("dragenter");
      //$(this).addClass("dragOver");
    });
    ngRows.on("dragover", function(evt) {
      //console.log("dragover");
      $(this).addClass("dragOver");
    });
    ngRows.on("dragleave", function(evt) {
      //console.log("dragleave");
      $(this).removeClass("dragOver");
    });

    // Enable drag and add event handlers.
    var elm = rowItemClicked.clone.elm;
    elm.attr("draggable", "true");
    elm.off("dragstart");
    elm.on("dragstart", function(evt) {

      //console.log("onRowMouseDown() Start drag and drop rowItemsMove.length=" + rowItemsMove.length);

      // Set dataTransfer options.
      var dataTransfer = evt.originalEvent.dataTransfer;
      dataTransfer.effectAllowed = "move";
      dataTransfer.dropEffect = "move";
      dataTransfer.setData("text", "dummy data for Firefox"); // Error occurs if you set "text/plain" in IE11.

      // Add dragging CSS class to all rows to move.
      for (var i = 0; i < rowItemsMove.length; i++) {
        var elm = rowItemsMove[i].clone.elm;
        $(elm).addClass("dragging");
      }

      // Throw rowDragStart event.
      var args = {
        "mouseDownEvent": event,
        "dragStartEvent": evt,
        "dataTransfer": dataTransfer,
        "rowItemClicked": rowItemClicked,
        "rowItemsMove": rowItemsMove
      };
      $scope.$emit("ngGrigDraggableRowEvent_rowDragStart", args);

    });
    elm.off("dragend");
    elm.on("dragend", function(evt) {
      //console.log("onRowMouseDown() dragEnd");
      elm.removeAttr("draggable");
      elm.off("dragstart");
      elm.off("dragend");
      ngRows.off("dragenter");
      ngRows.off("dragover");
      ngRows.off("dragleave");
      ngRows.removeClass("dragOver");
      ngRows.removeClass("dragging");
    });

  } // END onRowMouseDown()


  /**
   * Dragover event handler
   */
  function dragOver(event) {
    event.preventDefault(); // This is needed to work properly.(onRowDrop())
  }


  /**
   * Drop event handler
   */
  function onRowDrop(event) {

    //console.log("onRowDrop()");
    event.preventDefault();

    // The rows are sorted.
    var sortInfo = grid.config.sortInfo;
    var isNeedInitialSort = false;
    if (sortInfo.fields && sortInfo.fields.length > 0) {

      if (!self.initialSortField) {
        //console.log("onRowDrop() The rows are sorted but no initialSrotField set. Do nothing.");
        return;
      }

      // Current sort view should be initial sort view.
      if (self.initialSortField !== sortInfo.fields[0] ||
          (self.initialSortField === sortInfo.fields[0] && sortInfo.directions[0] !== "asc")) {

        //console.log("onRowDrop() Current sort view should be initial sort view. initialSortField=" + self.initialSortField);

        // Clear rowsSrc
        rowsSrc.length = 0;

        // Push rowItems.entity into rowSrc in order as we see.
        for (var i = 0; i < rowItems.length; i++) {
          rowsSrc.push(rowItems[i].entity);
        }

        //Set sort flag
        isNeedInitialSort = true;

      } else {
        //console.log("onRowDrop() The rows are sorted by initialSortField. Continue...");
      }

    } else {
      //console.log("onRowDrop() The rows are not sorted. Continue...");
    }

    // Sort by initialSortField. This needs before applyDataChanges()
    if (isNeedInitialSort) {
      var sortCol = null;
      var cols = $scope.columns;
      for (var i = 0; i < cols.length; i++) {
        var col = cols[i];
        if (col.field === self.initialSortField) {
          sortCol = col;
          break;
        }
      }
      sortCol.sort();
    }

    // Get the destination rowItem.
    var rowItemDst = getTargetRowItemFromEvent(event);

    // Throw changeRowOrderPre event.
    $scope.$emit("ngGrigDraggableRowEvent_changeRowOrderPre", isNeedInitialSort);

    // Change the row order.
    changeRowOrder(rowItemsMove, rowItemDst);

    // Throw changeRowOrderPost event.
    $scope.$emit("ngGrigDraggableRowEvent_changeRowOrderPost", isNeedInitialSort);

    // Apply data changes.
    applyDataChanges();

    // If there isn't an apply already in progress lets start one.
    services.DomUtilityService.digest($scope.$root);

    // Clear out the rowToMove object.
    rowItemsMove.length = 0;

  } // END onRowDrop()


  /**
   * Change the row order.
   */
  function changeRowOrder(rowItemsMove, rowItemDst) {

    // Insert position
    var insPos = rowItems.indexOf(rowItemDst) + 1;
    //console.log("changeRowOrder() insPos=" + insPos);

    // Replace rows to dummy rows.
    var rowsDummy = [];
    var rowsIns = [];
    for (var i = 0; i < rowItemsMove.length; i++) {
      var rowDummy = {"isDummy": true};
      rowsDummy.push(rowDummy);
      rowsIns.push(rowsSrc.splice(rowItemsMove[i].rowIndex, 1, rowDummy)[0]);
    }

    // Insert rows to move into the data src array.
    for (var i = 0; i < rowsIns.length; i++) {
      rowsSrc.splice(insPos + i, 0, rowsIns[i]);
    }

    // Clean up dummy rows.
    for (var i = 0; i < rowsDummy.length ; i++) {
      rowsSrc.splice(rowsSrc.indexOf(rowsDummy[i]), 1);
    }

  } // END changeRowOrder()


  /**
   * Apply data changes manually.
   *
   * Copied from ng-grid.js line 2931-. And modified a bit.
   * It seems that the dataWatcher doesn't refresh until the data array length is changed.
   * Is there any good way to apply data changes manually?
   */
  function applyDataChanges() {
    //console.log("applyDataChanges() ng-gird.plugin.draggablerow.js internal func.");
    grid.data = $.extend([], $scope.$eval(grid.config.data));
    grid.rowFactory.fixRowCache();
    angular.forEach(grid.data, function (item, j) {
      var indx = grid.rowMap[j] || j;
      if (grid.rowCache[indx]) {
        grid.rowCache[indx].ensureEntity(item);
      }
      grid.rowMap[indx] = j;
    });
    grid.searchProvider.evalFilter();
    grid.configureColumnWidths();
    grid.refreshDomSizes();
    if (grid.config.sortInfo.fields.length > 0) {
      grid.sortColumnsInit();
      $scope.$emit('ngGridEventSorted', grid.config.sortInfo);
    }
    $scope.$emit("ngGridEventData", grid.gridId);
    $scope.adjustScrollTop(grid.$viewport.scrollTop(), true);
  }


} // END ngGridDraggableRow()
