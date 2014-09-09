// AngularJS Application Module
var app = angular.module("app", ['ngGrid']);
app.controller("ctrl", function($scope) {

  // grid data
  $scope.data = [
    {idx: 0, title: 'eve' },
    {idx: 1, title: 'dog' },
    {idx: 2, title: 'cat' },
    {idx: 3, title: 'bird' },
    {idx: 4, title: 'adam' }
  ];

  // ngGrid setup
  $scope.gridOpt = {
    data: 'data',
    columnDefs: [
      {field:'idx', displayName:'#', width:'64px'},
      {field:'title', displayName:'title'}
    ],
    sortInfo: {fields:['idx'], directions:['asc']},
    plugins: [ new ngGridDraggableRow('idx') ] // setting 'idx' as initial sort field
  };

  // start row drag
  $scope.$on("ngGrigDraggableRowEvent_rowDragStart", function(evt, args) {

    console.log("START row drag");

    // if drag multiple rows, set custom drag image.
    if (args.rowItemsMove.length > 1) {
      $scope.dragRowNum = args.rowItemsMove.length;
      $scope.$apply();
      if (args.dataTransfer.setDragImage) {
        var dragImage = document.getElementById('dragIconMultiRows');
        args.dataTransfer.setDragImage(dragImage, 16, 16);
      }
    }

  });

  // start reordering rows by drag
  $scope.$on('ngGrigDraggableRowEvent_changeRowOrderPre', function(evt, willSortInit) {
    console.log("START reordering rows by drag");
    if (willSortInit) {
      console.log("sort wiil change");
    }
  });

  // end reordering rows by drag
  $scope.$on('ngGrigDraggableRowEvent_changeRowOrderPost', function(evt, doneSortInit) {
    console.log("END reordering rows by drag");
    updateArrayIndex($scope.data);
    if (doneSortInit) {
      console.log("sort initialized");
    }
  });

  /* Update array index */
  function updateArrayIndex(rows) {
    for (var i = 0; i < rows.length; i++) {
      rows[i].idx = i;
    }
    return rows;
  }

}); // END app.controller();
